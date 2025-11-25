import { Request, Response, NextFunction } from "express";
import { SellerToken, UserToken } from "./index.js";
declare global {
    namespace Express {
        interface Request {
            publicAddress?: string;
            sellerData?: SellerToken;
            userData: UserToken;
            session?: {
                jwt?: string;
                [key: string]: any;
            } | null | undefined;
        }
    }
}
export declare const getPublicAddress: (req: Request, res: Response, next: NextFunction) => void;
