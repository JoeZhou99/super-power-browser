import {token} from "@/utils/request";
export class Auth { static getToken(){return token();} static isLoggedIn(){return Boolean(token());} }
