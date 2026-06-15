declare module "@supabase/supabase-js" {
  export function createClient(url: string, key: string): {
    storage: {
      from(bucket: string): {
        upload(
          path: string,
          file: ArrayBuffer | Uint8Array | Buffer,
          options?: { contentType?: string; upsert?: boolean }
        ): Promise<{ error: { message: string } | null }>;
        getPublicUrl(path: string): { data: { publicUrl: string } };
      };
    };
  };
}
