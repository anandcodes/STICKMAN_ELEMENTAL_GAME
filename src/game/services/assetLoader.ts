export class AssetLoader {
  private assets: Map<string, HTMLImageElement> = new Map();
  private static instance: AssetLoader;

  private constructor() {}

  public static getInstance(): AssetLoader {
    if (!AssetLoader.instance) {
      AssetLoader.instance = new AssetLoader();
    }
    return AssetLoader.instance;
  }

  private loading: Map<string, Promise<void>> = new Map();

  public async loadAssets(assetMap: Record<string, string>): Promise<void> {
    const promises = Object.entries(assetMap).map(([key, url]) => {
      if (this.assets.has(key)) return Promise.resolve();
      if (this.loading.has(key)) return this.loading.get(key);
      
      const p = this.loadAsset(key, url);
      this.loading.set(key, p);
      return p;
    });
    await Promise.all(promises);
  }

  private loadAsset(key: string, url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        this.assets.set(key, img);
        this.loading.delete(key);
        resolve();
      };
      img.onerror = () => {
        console.error(`Failed to load asset: ${key} from ${url}`);
        this.loading.delete(key);
        reject(new Error(`Failed to load asset: ${key}`));
      };
    });
  }

  public hasAsset(key: string): boolean {
    return this.assets.has(key);
  }

  public getLoadedAsset(key: string): HTMLImageElement | undefined {
    const asset = this.assets.get(key);
    if (!asset || !asset.complete || asset.naturalWidth <= 0) {
      return undefined;
    }
    return asset;
  }

  public getAsset(key: string): HTMLImageElement {
    const asset = this.assets.get(key);
    if (!asset) {
      // Return an empty image or throw error to prevent crashes
      console.warn(`Asset not found: ${key}. Returning empty image.`);
      return new Image();
    }
    return asset;
  }
}

export const assetLoader = AssetLoader.getInstance();
