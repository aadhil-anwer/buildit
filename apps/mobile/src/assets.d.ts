// Metro turns an imported image into a numeric asset id.
declare module "*.png" {
  const asset: number;
  export default asset;
}
