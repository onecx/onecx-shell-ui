// import { HttpClient } from '@angular/common/http'
// import { Injectable } from '@angular/core'
// import { firstValueFrom } from 'rxjs'
// import { LoadWorkspaceConfigResponse } from 'src/app/shared/generated'

// interface RemoteAngularVersion {
//   remoteEntryUrl: string
//   version: string
//   major: string
// }

// @Injectable({ providedIn: 'root' })
// export class PackageService {
//   angularVersionRegex = /\"@angular\/core\",\"(\d+)\.(\d+)\.(\d+)\"/
//   constructor(private http: HttpClient) {}

//   async init(workspaceConfig: LoadWorkspaceConfigResponse) {
//     const versions = await this.collectAngularVersions(workspaceConfig)

//     this.appendShellVersion(versions)

//     console.log(versions)

//     this.constructOrder(versions)
//   }

//   private appendShellVersion(versions: Array<RemoteAngularVersion>) {
//     const shellPackage = (window as any)['@onecx/angular-webcomponents']['platformCache'].entries().next().value[0]

//     versions.push({
//       remoteEntryUrl: 'shell',
//       version: shellPackage.full,
//       major: shellPackage.major
//     })
//   }

//   private constructOrder(versions: Array<RemoteAngularVersion>) {
//     // TODO: Check if correct
//     const uniqueMajorVersions = this.getUniqueMajorVersions(versions)

//     // TODO: Check if correct highest versions chosen
//     const majorVersionMap = uniqueMajorVersions.map((mv) => this.getHighestRemoteForMajorVersion(mv, versions))
//     // TODO: Save info in window

//     // TODO: Adjust shell loading mechanism so it aligns with
//     // TODO: Adjust slot loading mechanism so it aligns with

//     // if I am one with highest I just load
//     // if I am not one with highest I am loading the highest one (if not loaded already?)
//   }

//   private async collectAngularVersions(workspaceConfig: LoadWorkspaceConfigResponse) {
//     const uniqueRemotes = this.getUniqueRemotes(workspaceConfig)
//     const remotesPromises = uniqueRemotes.map((r) => this.fetchAngularVersion(r))

//     const angularVersions = await Promise.all(remotesPromises)

//     const versions = uniqueRemotes.map((item, index, _) => {
//       return {
//         remoteEntryUrl: item,
//         version: angularVersions[index].version,
//         major: angularVersions[index].major
//       }
//     })

//     return versions
//   }

//   private getHighestRemoteForMajorVersion(majorVersion: string, versions: Array<RemoteAngularVersion>) {
//     versions.filter((v) => v.major === majorVersion)
//   }

//   private getUniqueMajorVersions(versions: Array<RemoteAngularVersion>) {
//     return versions.map((v) => v.major).filter((item, index, self) => index === self.findIndex((t) => t === item))
//   }

//   private getUniqueRemotes(workspaceConfig: LoadWorkspaceConfigResponse) {
//     return [...workspaceConfig.routes, ...workspaceConfig.components]
//       .filter((item, index, self) => index === self.findIndex((t) => t.remoteEntryUrl === item.remoteEntryUrl))
//       .map((r) => {
//         return r.remoteEntryUrl
//       })
//   }

//   private async fetchAngularVersion(url: string) {
//     const fetchedRemoteEntry = await firstValueFrom(
//       this.http.get(url, {
//         responseType: 'text'
//       })
//     )

//     const match = fetchedRemoteEntry.match(this.angularVersionRegex)
//     const version = match ? `${match[1]}.${match[2]}.${match[3]}` : ''
//     const major = match ? `${match[1]}` : ''

//     return {
//       version,
//       major
//     }
//   }
// }
