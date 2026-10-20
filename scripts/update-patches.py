#!/usr/bin/env python3
"""Refresh _data/patches.json from Gerrit (review.typo3.org).

Reads the tip of the patch chain from _data/patches.json ("source.tip"),
fetches the chain of related changes and the details of every open change,
and writes the result back, ordered from the base of the chain to the tip.

Usage: scripts/update-patches.py [TIP_CHANGE_NUMBER]
"""

import datetime
import json
import pathlib
import re
import sys
import urllib.request

GERRIT = 'https://review.typo3.org'
PROJECT = 'Packages/TYPO3.CMS'
DATA = pathlib.Path(__file__).resolve().parent.parent / '_data' / 'patches.json'


def fetch(path):
    request = urllib.request.Request(GERRIT + path, headers={'Accept': 'application/json'})
    with urllib.request.urlopen(request, timeout=30) as response:
        body = response.read().decode('utf-8')
    # Gerrit prefixes JSON responses with )]}' to prevent XSSI
    return json.loads(body.split('\n', 1)[1])


def trailer(message, key):
    return [value.strip() for value in re.findall(rf'^{key}:\s*(.+)$', message, re.MULTILINE)]


def issue_numbers(values):
    return [int(number) for value in values for number in re.findall(r'#(\d+)', value)]


def main():
    current = json.loads(DATA.read_text()) if DATA.exists() else {'source': {}}
    tip = int(sys.argv[1]) if len(sys.argv) > 1 else current['source']['tip']

    related = fetch(f'/changes/{tip}/revisions/current/related')['changes']
    numbers = [entry['_change_number'] for entry in related if entry.get('status') == 'NEW']

    changes = []
    for number in reversed(numbers):
        change = fetch(f'/changes/{number}?o=CURRENT_REVISION&o=CURRENT_COMMIT')
        revision = change['revisions'][change['current_revision']]
        message = revision['commit']['message']
        changes.append({
            'number': change['_number'],
            'url': f'{GERRIT}/c/{PROJECT}/+/{change["_number"]}',
            'subject': change['subject'],
            'change_id': change['change_id'],
            'status': change['status'],
            'work_in_progress': bool(change.get('work_in_progress')) or change['subject'].startswith('[WIP]'),
            'patchset': revision['_number'],
            'branch': change['branch'],
            'hashtags': change.get('hashtags', []),
            'resolves': issue_numbers(trailer(message, 'Resolves') + trailer(message, 'Fixes')),
            'related': issue_numbers(trailer(message, 'Related')),
            'insertions': change['insertions'],
            'deletions': change['deletions'],
            'updated': change['updated'][:19].replace(' ', 'T') + 'Z',
        })

    result = {
        'source': {
            'gerrit': GERRIT,
            'project': PROJECT,
            'tip': tip,
            'generated_by': 'scripts/update-patches.py',
            'generated_at': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        },
        'changes': changes,
    }
    DATA.write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n')
    print(f'Wrote {len(changes)} changes to {DATA.relative_to(DATA.parent.parent)}')


if __name__ == '__main__':
    main()
