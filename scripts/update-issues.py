#!/usr/bin/env python3
"""Refresh _data/issues.json from Forge (forge.typo3.org).

Collects the epic from _data/issues.json ("source.epic") and every issue
referenced by _data/patches.json, and stores subject, tracker and status.

Usage: scripts/update-issues.py
"""

import datetime
import json
import pathlib
import urllib.request

FORGE = 'https://forge.typo3.org'
ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / '_data' / 'issues.json'
PATCHES = ROOT / '_data' / 'patches.json'


def fetch(number):
    # Forge sits behind a bot check that lets plain API clients pass, but not browser-like user agents
    request = urllib.request.Request(f'{FORGE}/issues/{number}.json', headers={'Accept': 'application/json'})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode('utf-8'))['issue']


def main():
    current = json.loads(DATA.read_text())
    epic = current['source']['epic']
    patches = json.loads(PATCHES.read_text())['changes']

    numbers = [epic]
    for change in patches:
        for number in change['resolves'] + change['related']:
            if number not in numbers:
                numbers.append(number)

    issues = []
    for number in numbers:
        issue = fetch(number)
        issues.append({
            'number': issue['id'],
            'url': f'{FORGE}/issues/{issue["id"]}',
            'subject': issue['subject'],
            'tracker': issue['tracker']['name'],
            'status': issue['status']['name'],
            'parent': issue.get('parent', {}).get('id'),
        })

    result = {
        'source': {
            'forge': FORGE,
            'epic': epic,
            'generated_by': 'scripts/update-issues.py',
            'generated_at': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        },
        'issues': issues,
    }
    DATA.write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n')
    print(f'Wrote {len(issues)} issues to {DATA.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
