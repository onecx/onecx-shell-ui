/**
 * onecx-shell-bff
 * Backend-For-Frontend (BFF) service for OneCX Shell. This API provides base configuration information for frontends.
 *
 * The version of the OpenAPI document: 1.0.0
 * Contact: tkit_dev@1000kit.org
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */
import { PathMatch } from './pathMatch';
import { UIEndpoint } from './uIEndpoint';
import { Technologies } from './technologies';


export interface Route { 
    url: string;
    baseUrl: string;
    remoteEntryUrl: string;
    appId: string;
    productName: string;
    productVersion: string;
    technology?: Technologies;
    exposedModule: string;
    pathMatch: PathMatch;
    remoteName?: string;
    elementName?: string;
    displayName: string;
    endpoints?: Array<UIEndpoint>;
}



