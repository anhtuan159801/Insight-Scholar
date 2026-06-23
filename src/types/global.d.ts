declare const process: {
  env: Record<string, string | undefined>;
};

declare module '@google/genai';

declare module '*?url' {
  const url: string;
  export default url;
}
