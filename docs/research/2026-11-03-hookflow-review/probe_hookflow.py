#!/usr/bin/env python3
"""Reproduce integration blockers against a reviewed, unchanged HookFlow snapshot.
Only synthetic data and disposable temporary directories. No network, agent CLIs
or real vaults. Installer behavior is exercised only in fixtures. This script
collects extra probes; run the original unittest suite separately.
"""
import argparse, hashlib, json, os, platform, shutil, subprocess, sys, tempfile
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
args = parser.parse_args()
source = args.source.resolve()
expected_hashes = {'__init__.py': '3d6aab72072104377682cde701f80bf9d8ec69eb19c4bb3078136c504a056b69', 'claudian_doctor.py': 'c06cd1848975d6eb52ce2bdc4685c4778d055ebfde356159c2940bc3f01b65dc', 'dispatch.py': '3e965ad68301c9a8f8334c5e5f48a21509c0bd8ebddc7a28539598a66e93f1f0', 'gemini_bridge.py': '5ed8006e9a5f81f59de26498cb24e6d0a513a67f16046c66dc62c142e895234a', 'git_quality.py': '5bb0f2da59f3c740f6e9f62f5a6bc11e8de5849e4e23eba69a0c0fa5928813d5', 'policy.json': 'f062cf94a0ba2a361d6981e29340f82e40da1a8217d1136d6d6b0fcf14df7ecd'}
for name, expected in expected_hashes.items():
    actual = hashlib.sha256((source / "hookflow" / name).read_bytes()).hexdigest()
    if actual != expected:
        raise SystemExit(f"Unreviewed source bytes: {name}")
sys.path.insert(0, str(source))
from hookflow import dispatch, gemini_bridge, git_quality
from hookflow.claudian_doctor import inspect_claudian
results = []

def record(code, expected, observed, passes):
    results.append({'id': code, 'expected': expected, 'observed': observed,
                    'status': 'PASS' if passes else 'FAIL'})

with tempfile.TemporaryDirectory(prefix='hf-review-') as tmp:
    base = Path(tmp)
    env = dict(os.environ, GIT_CONFIG_GLOBAL='/dev/null', GIT_CONFIG_NOSYSTEM='1',
               PYTHONDONTWRITEBYTECODE='1')
    def git(root, *cmd):
        return subprocess.run(['git', '-c', 'core.hooksPath='+str(base/'no-hooks'),
                               '-c','user.name=Fixture', '-c','user.email=fixture@example.invalid',
                               *cmd], cwd=root, env=env, check=True, capture_output=True, text=True)
    def repo(name):
        r = base/name; r.mkdir(); git(r,'init','-q')
        (r/'00_KERNEL').mkdir(); (r/'docs').mkdir()
        (r/'00_KERNEL/locked.md').write_text('# Fixture\n', encoding='utf-8')
        git(r,'add','00_KERNEL/locked.md'); git(r,'commit','-qm','fixture baseline')
        return r
    r=repo('delete'); git(r,'rm','00_KERNEL/locked.md')
    value=git_quality.check_staged(r)
    record('HF-R01', 'Reject deletion staged under protected path', value, bool(value))
    r=repo('rename'); git(r,'mv','00_KERNEL/locked.md','docs/moved.md')
    value=git_quality.check_staged(r)
    record('HF-R02', 'Reject rename whose source is protected', value, bool(value))

    event={'tool_name':'apply_patch','tool_input': {'input':
       '*** Begin Patch\n*** Update File: docs/a.md\n*** Move to: 00_KERNEL/moved.md\n@@\n-old\n+new\n*** End Patch'}}
    reason, decision=dispatch.check_write(event, dispatch.load_policy())
    record('HF-R03', 'Reject apply_patch move destination under protected path',
           {'paths':dispatch.relative_paths(event),'decision':decision}, decision=='deny')

    copy=base/'bad-policy'; shutil.copytree(source/'hookflow',copy/'hookflow')
    (copy/'hookflow/policy.json').write_text('{ broken',encoding='utf-8')
    p=subprocess.run([sys.executable,str(copy/'hookflow/dispatch.py'),'pre-tool'],
        input=json.dumps({'tool_name':'Write','tool_input':{'file_path':'00_KERNEL/x.md'}}),
        capture_output=True,text=True,cwd=copy,env=env,timeout=5)
    observed={'exit_code':p.returncode,'traceback':'Traceback' in p.stderr,'stdout':p.stdout}
    record('HF-R04', 'Invalid policy gives governed denial (exit 2, no traceback)',observed,
           p.returncode==2 and 'Traceback' not in p.stderr)

    r=base/'symlink'; (r/'.gemini').mkdir(parents=True)
    outside=base/'outside-settings.json'; outside.write_text('{"theme":"preserve"}',encoding='utf-8')
    (r/'.gemini/settings.json').symlink_to(outside)
    before=outside.read_bytes(); error=None
    try: gemini_bridge.mutate(r,'apply',commit=True)
    except (ValueError,OSError) as e: error=type(e).__name__
    changed=outside.read_bytes()!=before
    record('HF-R05','Installer must not write outside root through a symlink',
           {'outside_file_changed':changed,'exception':error},not changed)

    r=base/'dryrun'; (r/'.gemini').mkdir(parents=True)
    sentinel='SYNTHETIC_DO_NOT_LOG_92'
    (r/'.gemini/settings.json').write_text(json.dumps({'env':{'TEST_TOKEN':sentinel}}),encoding='utf-8')
    p=subprocess.run([sys.executable,str(source/'hookflow/gemini_bridge.py'),'--root',str(r),'--dry-run'],
                     capture_output=True,text=True,env=env,timeout=5)
    record('HF-R06','Dry-run diagnostics must not print unrelated config values',
           {'sentinel_in_stdout':sentinel in p.stdout,'exit_code':p.returncode},sentinel not in p.stdout)

    value=git_quality.lint_markdown('Primera línea  \nSegunda línea\n')
    record('HF-R07','Valid Markdown hard break must not be rejected as accidental whitespace',value,not value)
    value=git_quality.lint_markdown('```text\n#Mal encabezado\nEn el vertiginoso mundo\n```\n')
    record('HF-R08','Protected code/example block excluded from prose lint',value,not value)

    r=base/'doctor'; (r/'.claude').mkdir(parents=True)
    (r/'.claude/settings.json').write_text(json.dumps({'hooks':{'PreToolUse':[{'hooks':[{
        'type':'command','command':'echo hookflow/dispatch.py is not being run'}]}]}}),encoding='utf-8')
    value=next(x for x in inspect_claudian(r,environment={}) if x['check']=='hookflow:PreToolUse')
    record('HF-R09','A mention in echo must not be recognized as a dispatcher definition',value,value['status']!='pass')

    logroot=base/'logs'; original=dispatch.RUNTIME; dispatch.RUNTIME=logroot
    try:
        dispatch.audit('pre-tool','allow',{'hook_event_name':'PreToolUse','tool_name':'Write','session_id':'synthetic-a','tool_use_id':'synthetic-1'})
        entry=json.loads((logroot/'events.jsonl').read_text(encoding='utf-8'))
    finally: dispatch.RUNTIME=original
    record('HF-R10','Evidence supports session/action correlation without raw prompts',
           {'record_keys':sorted(entry)}, 'session_id' in entry and 'tool_use_id' in entry)

payload={'source':source.name,'python':platform.python_version(),
         'source_files_sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((source/'hookflow').glob('*')) if p.is_file()},
         'additional_checks':results,'summary':{'checks':len(results),'passed':sum(r['status']=='PASS' for r in results),'failed':sum(r['status']=='FAIL' for r in results)},
         'scope':'Synthetic integration-acceptance probes; original snapshot unmodified; not agent E2E.'}
args.out.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(payload,ensure_ascii=False,indent=2))
