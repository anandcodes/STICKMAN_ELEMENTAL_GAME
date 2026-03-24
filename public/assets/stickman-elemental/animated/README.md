# Stickman Elemental Animated Pack

Generated animation assets for:
- `hero_base`, `hero_fire`, `hero_water`, `hero_earth`, `hero_air`
- `monster_fire_imp`, `monster_water_slime`, `monster_earth_brute`, `monster_air_wisp`, `monster_void_hunter`

Each entity includes:
- `idle`, `run`, `attack`, `death`
- 8 frames per animation
- frame size: `128x128`

## Paths
- Sprite sheets: `assets/animated/spritesheets/png/<character|monster>/<entity>_<animation>.png`
- Sprite sheet WebP: same path with `.webp`
- Atlases (image): `assets/animated/atlases/png/<character|monster>/<entity>_atlas.png`
- Atlases (WebP): same path with `.webp`
- Atlases (JSON): `assets/animated/atlases/json/<character|monster>/<entity>_atlas.json`
- Manifest: `assets/animated/animated-asset-manifest.json`

## Phaser Example (Spritesheet)

```ts
this.load.spritesheet('heroFireRun', 'assets/animated/spritesheets/png/character/hero_fire_run.png', {
  frameWidth: 128,
  frameHeight: 128
});

this.anims.create({
  key: 'hero-fire-run',
  frames: this.anims.generateFrameNumbers('heroFireRun', { start: 0, end: 7 }),
  frameRate: 12,
  repeat: -1
});
```

## Phaser Example (Atlas JSON)

```ts
this.load.atlas(
  'heroFireAtlas',
  'assets/animated/atlases/png/character/hero_fire_atlas.png',
  'assets/animated/atlases/json/character/hero_fire_atlas.json'
);

this.anims.create({
  key: 'hero-fire-attack',
  frames: this.anims.generateFrameNames('heroFireAtlas', {
    start: 0,
    end: 7,
    prefix: 'attack_',
    zeroPad: 3
  }),
  frameRate: 14,
  repeat: 0
});
```

## Regenerate

```bash
python game/tools/generate_sprite_atlases.py
```
