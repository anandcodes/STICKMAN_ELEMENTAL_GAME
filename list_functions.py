import re

with open('src/game/renderers/uiRenderer.ts', 'r') as f:
    content = f.read()
    functions = re.findall(r'function (\w+)', content)
    print('\n'.join(functions))
