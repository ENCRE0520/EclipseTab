// Declarations for imported assets
declare module "*.svg" {
    const src: string;
    export default src;
}
declare module "*.png" {
    const src: string;
    export default src;
}

declare module "*.svg?raw" {
    const content: string;
    export default content;
}
