/**
 * onecx-shell-bff
 * OneCx shell Bff
 *
 * The version of the OpenAPI document: 1.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */
import { AccountSettings } from './accountSettings';
import { UserPerson } from './userPerson';


export interface UserProfile { 
    userId: string;
    organization?: string;
    person: UserPerson;
    accountSettings?: AccountSettings;
}

