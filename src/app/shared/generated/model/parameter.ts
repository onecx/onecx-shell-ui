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
import { ParameterValue } from './parameterValue';


export interface Parameter { 
    displayName?: string;
    description?: string;
    applicationId: string;
    productName: string;
    name: string;
    value: ParameterValue;
    importValue?: ParameterValue;
}

