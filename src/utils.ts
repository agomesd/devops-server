import { SUPPORTED_REGIONS } from "./consts";

export function getRegion(url: string): string {
  // this function makes the assumption that the client will always send a region as the first part of the url after the domain
  return url.split("/")[1];
}

export function validateRegion(region: string): boolean {
  // ensure that the region is supported by the API
  return SUPPORTED_REGIONS.includes(region);
}

export function buildEnpointString(region: string, host: string): string {
  return `https://data--${region}.${host}`;
}
