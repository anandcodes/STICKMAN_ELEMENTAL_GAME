# Stickman Elemental Asset Pack (SVG)

This pack is optimized for Phaser.js and mobile-friendly scaling.

## Contents
- `images/characters`: player stickman base + 4 elemental forms
- `images/monsters`: elemental and neutral enemy sprites
- `images/environment`: platforms and elemental totems
- `images/ui`: elemental power icons
- `images/effects`: elemental projectile sprites

## Phaser preload example

```ts
this.load.svg('heroFire', 'assets/images/characters/hero_fire.svg');
this.load.svg('monsterFireImp', 'assets/images/monsters/monster_fire_imp.svg');
this.load.svg('platformStone', 'assets/images/environment/platform_stone.svg');
this.load.svg('iconFire', 'assets/images/ui/icon_fire_power.svg');
this.load.svg('projFire', 'assets/images/effects/projectile_fire.svg');
```

## Notes
- Use `setScale()` in Phaser to tune visual size per scene.
- For best runtime performance on low-end mobile devices, convert SVG files to texture atlases (PNG/WebP) for release builds.
