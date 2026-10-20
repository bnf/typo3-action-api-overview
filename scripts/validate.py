#!/usr/bin/env python3
"""Validate the data in _data/ before committing.

Checks every _data/<name>.json against schemas/<name>.schema.json, the
cross-references between the files (patches, screenshots, layers, scopes,
sections) and the JSON formatting. With --fix, the formatting is rewritten
in place (2 spaces, UTF-8, trailing newline); the content is never changed.

Usage: scripts/validate.py [--fix]
Requires: pip install jsonschema
"""

import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / '_data'
SCHEMAS = ROOT / 'schemas'

try:
    import jsonschema
except ImportError:
    sys.exit('Missing dependency: run "pip install jsonschema" (or "pip install --user jsonschema")')


def formatted(data):
    return json.dumps(data, indent=2, ensure_ascii=False) + '\n'


def main():
    fix = '--fix' in sys.argv
    errors = []
    data = {}

    for path in sorted(DATA.glob('*.json')):
        name = path.stem
        text = path.read_text(encoding='utf-8')
        try:
            data[name] = json.loads(text)
        except json.JSONDecodeError as error:
            errors.append(f'_data/{path.name}: invalid JSON: {error}')
            continue
        if text != formatted(data[name]):
            if fix:
                path.write_text(formatted(data[name]), encoding='utf-8')
                print(f'Reformatted _data/{path.name}')
            else:
                errors.append(f'_data/{path.name}: not formatted, run scripts/validate.py --fix')
        schema_path = SCHEMAS / f'{name}.schema.json'
        if not schema_path.exists():
            errors.append(f'_data/{path.name}: no schema at schemas/{schema_path.name}')
            continue
        validator = jsonschema.Draft202012Validator(json.loads(schema_path.read_text(encoding='utf-8')))
        for error in sorted(validator.iter_errors(data[name]), key=lambda e: list(e.absolute_path)):
            location = '/'.join(str(part) for part in error.absolute_path) or '(root)'
            errors.append(f'_data/{path.name}: {location}: {error.message}')

    if errors:
        report(errors)

    errors += check_references(data)
    report(errors)
    print(f'OK: {len(data)} data files are valid')


def check_references(data):
    errors = []
    patches = {change['number'] for change in data['patches']['changes']}
    issues = {issue['number'] for issue in data['issues']['issues']}
    screenshots = {shot['id'] for shot in data['screenshots']}

    for section in data['sections']:
        if not (ROOT / '_includes' / 'sections' / f'{section["id"]}.html').exists():
            errors.append(f'sections.json: no template _includes/sections/{section["id"]}.html for "{section["id"]}"')
        for source in section['sources']:
            if source not in data:
                errors.append(f'sections.json: section "{section["id"]}" names unknown data file "{source}"')

    channels = {channel['id'] for channel in data['channels']}
    for tile in data['intro']['channels']:
        if tile['channel'] not in channels:
            errors.append(f'intro.json: tile "{tile["title"]}" points to unknown channel "{tile["channel"]}"')

    code = data['concept']['code']['code']
    for part in data['concept']['parts']:
        if part['match'] not in code:
            errors.append(f'concept.json: part {part["ref"]} matches no text in the code: "{part["match"]}"')

    layers = {layer['id']: layer for layer in data['stack']['layers']}
    for scenario in data['stack']['scenarios']:
        for index, step in enumerate(scenario['steps']):
            layer = layers.get(step['layer'])
            if layer is None:
                errors.append(f'stack.json: scenario "{scenario["id"]}" step {index}: unknown layer "{step["layer"]}"')
            elif step['item'] not in layer['items']:
                errors.append(f'stack.json: scenario "{scenario["id"]}" step {index}: "{step["item"]}" is no item of layer "{step["layer"]}"')

    calculator = data['security']['calculator']
    scopes = {scope['id'] for scope in calculator['scopes']}
    users = {user['id'] for user in calculator['users']}
    if calculator['defaults']['user'] not in users:
        errors.append(f'security.json: default user "{calculator["defaults"]["user"]}" does not exist')
    for scope in calculator['defaults']['requested'] + calculator['defaults']['configured'] + [s for a in calculator['actions'] for s in a['scopes']]:
        if scope not in scopes:
            errors.append(f'security.json: unknown scope "{scope}"')
    for shot in data['security']['app_types']['screenshots']:
        if shot not in screenshots:
            errors.append(f'security.json: unknown screenshot "{shot}"')

    for case in data['use_cases']:
        for number in case['patches']:
            if number not in patches:
                errors.append(f'use_cases.json: "{case["title"]}" references change {number}, which is not in patches.json')

    for shot in data['screenshots']:
        if not (ROOT / shot['file']).exists():
            errors.append(f'screenshots.json: file {shot["file"]} does not exist')

    if data['issues']['source']['epic'] not in issues:
        errors.append('issues.json: the epic is missing, run scripts/update-issues.py')
    for change in data['patches']['changes']:
        for number in change['resolves']:
            if number not in issues:
                errors.append(f'patches.json: change {change["number"]} resolves #{number}, which is not in issues.json; run scripts/update-issues.py')
    return errors


def report(errors):
    if errors:
        print('\n'.join(errors), file=sys.stderr)
        sys.exit(f'{len(errors)} problem(s) found')


if __name__ == '__main__':
    main()
