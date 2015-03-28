/// <reference path="./../typings/tsd.d.ts" />

import fs = require('fs');
import _ = require('underscore');
import ini = require('ini');
import Configuration = require('./Configuration');

var
    authFilename = Configuration.authenticationFileName,
    authenticationMap: any = {},
    currentUser: User = null;

function createGuest(): User {
    var user = new User();
    user.name = 'anonymous';
    user.secret = '';
    user.rank = User.RANK_GUEST;

    return user;
}

export class User {

    static RANK_GUEST = 'guest';
    static RANK_ADMIN = 'admin';

    name: string;
    secret: string;
    rank: string;
}

export function getUser() {
    return currentUser;
}

export function auth(secret: string) {
    var user = createGuest();

    _.each(authenticationMap, function (userSecret: string, userName: string) {
        if (userSecret === secret) {
            user = new User();
            user.name = userName;
            user.secret = userSecret;
            user.rank = User.RANK_ADMIN;
        }
    });

    currentUser = user;
}


if (fs.existsSync(authFilename)) {
    authenticationMap = ini.parse(fs.readFileSync(authFilename).toString());
}
