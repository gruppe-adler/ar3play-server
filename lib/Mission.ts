export class MissionInfo {
    instanceId: string;
    name: string;
    worldname: string;
    starttime: number;

    endtime: number;
    is_streamable: boolean;

    constructor(instanceId: string, name: string, worldname: string, starttime: number) {
        this.instanceId = instanceId;
        this.name = name;
        this.starttime = starttime;
        this.worldname = worldname;
    }
}