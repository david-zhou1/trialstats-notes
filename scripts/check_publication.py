#!/usr/bin/env python3
"""Block accidental inclusion of private backups, vaults, and obvious sensitive data files."""
from pathlib import Path
import sys
root=Path(__file__).resolve().parents[1]
forbidden={'private-vault','vault.json','vault-backup.json','trialstats-personal-notes.json','notes-private.json','adsl.sas7bdat','adoe.sas7bdat'}
errors=[]
for p in root.rglob('*'):
 if not p.is_file() or '.git' in p.parts or '_site' in p.parts:continue
 n=p.name.lower()
 if n in forbidden or any(t in n for t in ('personal-backup','private-notes','vault-backup','patient-level')) or p.suffix.lower() in {'.sas7bdat','.dta','.rds','.xlsx','.xls'}:
  errors.append(str(p.relative_to(root)))
if errors:
 print('STOP: 检测到疑似私人数据：',*errors,sep='\n- ')
 sys.exit(1)
print('Public preflight checks passed (heuristic; human review remains mandatory).')
