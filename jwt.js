import jwt from "jsonwebtoken";

export function sign(payload, secretOrPrivateKey, options={}) {
    return new Promise((resolve, reject) => {
        jwt.sign(payload, secretOrPrivateKey, options, (error, encoded) => {
            if (error) {
                reject(error);
            } else {
                resolve(encoded);
            }
        })
    });
}

export function verify(token, secretOrPublicKey, options={}) {
    return new Promise((resolve, reject) => {
        jwt.verify(token, secretOrPublicKey, options, (error, decoded) => {
            if (error) {
                reject(error);
            } else {
                resolve(decoded);
            }
        });
    });
}