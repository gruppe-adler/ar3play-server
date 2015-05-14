/// <reference path="./../typings/tsd.d.ts" />

import sf = require('sprintf');
var sprintf = sf.sprintf;

export function getUnitSTRINGKey(instanceId: string, unitId: number, timestamp: number): string {
    return sprintf('mission:%s,unit:%d,ts:%d', encodeURIComponent(instanceId), unitId, timestamp);
}

export function getUnitSTRINGKeyPattern(instanceId: string): string {
    return sprintf('mission:%s,unit*', encodeURIComponent(instanceId));
}

export function getMissionHASHKey(instanceId: string): string {
    return sprintf('mission:%s,mission', encodeURIComponent(instanceId));
}

export function getAllMissionsZSETKey(): string {
    return 'missions';
}

export function getCurrentMissionSTRINGKey(serverId: string): string {
    return sprintf('currentInstanceId:%s', serverId);
}

export function getCreationsZSETKey(instanceId: string): string {
    return sprintf('mission:%s,creates', instanceId);
}

export function getDeathsZSETKey(instanceId: string): string {
    return sprintf('mission:%s,deaths', instanceId);
}

export function getLastinfoZSETKey(instanceId: string): string {
    return sprintf('mission:%s,lastinfo', instanceId);
}