Arma3 mission replays.

# Prerequisites

* [`sock.dll` / `sock.so` Arma3 server extension](https://bitbucket.org/micovery/sock.dll)
* [NodeJS](https://nodejs.org)/ (0.10 or so?)
* [Redis](http://redis.io/)

# Parts of the whole

* [Server](https://github.com/gruppe-adler/ar3play-server) (this repo)
* Arma3-Server
	* [example mission](https://github.com/gruppe-adler/ar3play-examplemission) **OR**
	* [Arma Serveraddon](https://github.com/gruppe-adler/ar3play-addon)
* [Webclient](https://github.com/gruppe-adler/ar3play-web)

# Installation of this thing here

* clone
* `npm install`
* edit configuration file, see `config.json.example`
* optionally add authentication file, see `config.json.example` and `auth.ini.example`
* start this thing with `npm start`
* start your armaserver with the sock extension pointing at host/port specified in config.json

# API

## sock-rpc

### missionStart

Parameters:
* mission name (string)
* world name (string)

Example:

`['missionStart', ['Co20_Foo', 'Stratis'] call sock_rpc;`

### missionEnd

Parameters: none

Example:

`['missionEnd', []] call sock_rpc;`

### echo

Parameters: any

Example:

`['echo', ['foo', 'bar', ['baz']]] call sock_rpc;`

### setIsStreamable

Should the REST API allow getting data while the mission is still running? Defaults to false

Parameters
* isStreamable (boolean)

Example:

`['setIsStreamable', [true]] call sock_rpc;`

### setPlayerData

Pass update information for one player

Parameters:
* playerData (`<playerdata>`)


```
<playerdata> := playerName, <position>|false, <role>|false, <status>|false

<position> := x, y, z, dir

<role> := <side>, <classtype>
<side> := WEST|EAST|GUER|CIV|EMPTY

<classtype> := unknown|at|engineer|explosive|leader|medic|mg|officer|recon|virtual
<status> := <condition>, <vehicle>

<condition> := alive|unconscious|dead
<vehicle> := unknown|helicopter|motorcycle|tank|truck|ship|none

```

* `x…z` are the player's coordinates as `getPos` returns them
* `dir` is the direction the unit is facing (0..360), as `dir` returns it
* values for `vehicle` will change soon(tm)
* "classtype" is a shitty name for what should be named "role" -.-
* either one <position>, <role>, <status> *may* be left out and a falsy value be passed instead

Example:

```
[
	'setPlayerData',
	['Fusselwurm', [25, 354, 0, 45], ['GUER', 'engineer'], ['alive', 'none']],
] call sock_rpc;
```

### setAllPlayerData

Pass information for several players.

Parameters:
* allPlayerData (array of `<playerdata>`)

see above for definition of <playerdata>

Example:

```
[
	'setAllPlayerData',
	[
		['Fusselwurm', [25, 354, 0, 45], ['GUER', 'engineer'], ['alive', 'none']],
		['nomisum', [25, 350, 0, 200], ['BLUFOR', 'officer'], ['alive', 'truck']],
	]
] call sock_rpc;

```

## REST

### GET /missions

returns mission instances as nice JSON

### GET /currentMission

returns instance ID of currently running mission

### GET /mission/:id/changes

`:id` is the mission instance ID - to be found either in `/currentMission` or in one of the values from `/missions`

query parameters:
* from (timestamp)
* to (timestamp)

Both parameters are mandatory, and the difference between them must be `0 < diff <= 100` !

Retrieve changes accumulated in the specified interval.

### GET /mission/:id

Get details for the mission instance: starttime, endtime, world name, mission name


### DELETE /mission/:id

Remove all saved data for mission instance.

You MUST send an `Authorization` header. See `auth.ini.example`
