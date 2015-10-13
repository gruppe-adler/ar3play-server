Arma3 mission replays.

[![Build Status](https://travis-ci.org/gruppe-adler/ar3play-server.svg?branch=master)](https://travis-ci.org/gruppe-adler/ar3play-server)

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
	* note: `pidfile, logfile, redis_max_used_memory, webserver_port` are optional
* optionally add authentication file, see `config.json.example` and `auth.ini.example`
* start this thing with `npm start`
* run your armaserver with the [ar3play-addon](https://github.com/gruppe-adler/ar3play-addon), and the sock extension pointing at host/port specified in config.json
* you can stop the process using `npm stop`

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

### setUnitDatum

Pass update information for one player

Parameters:

* <unitdatum>, an array containing:
	objectId: <objectId>
	x: int
	y: int
	z: int
	dir: 0..360
	side: WEST|EAST|GUER|CIV|EMPTY|...
	health: alive|unconscious|dead
	icon: string
	name: string
	container: <objectId>
	content: <array of <objectId>>


* `x…z` are the player's coordinates as `getPosATL` returns them
* `dir` is the direction the unit is facing (0..360), as `dir` returns it
* "classtype" is a shitty name for what should be named "role" -.-
* all values may be null or otherwise empty

Example:

```
[
	'setUnitDatum',
	[25, 1545, 1554, 0, 45, 'GUER', 'alive', 'engineer', 'Fusselwurm', 3, []],
] call sock_rpc;
```

### setAllUnitData

Pass information for several units.

Parameters:
* allUnitData (array of `<unitdatum>`)

see above for definition of <unitdatum>

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

# Development

## Testing

Testing the REST part is easy, of course. There are lots of possibilities there.
More interesting to know is how to test the RPC server.
For that, sock-rpc has its own script to act as RPC client.
For manual testing, use for example:

	node_modules/sock-rpc/bin/sock-rpc-client --host=::1 --port=5555

The resulting prompt lets you call the `sock_rpc` function like so:

	connect()
	sock_rpc('methodname', arguments)

### Automated Tests

I'm using mocha here, tests reside in `spec/` .
Note:
* sock-rpc debug output will spoil your funz.
* frisby tests fail because frisby is too retarded for my use case (alternatively, I am too retarded for frisby).
  I will need to find something better or fix it.

**DANGER THIS WILL USE YOUR NORMAL config.json , MURDER YOUR KITTENS AND CLEAR YOUR DATABASE**

	npm test
