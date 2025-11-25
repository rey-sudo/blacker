import { z } from "zod";
export declare const emailRegex: RegExp;
export declare const passwordRegex: RegExp;
export declare const usernameRegex: RegExp;
export declare const hexRegex: RegExp;
export declare const emailSchema: z.ZodEffects<z.ZodString, string, string>;
export declare const passwordSchema: z.ZodString;
export declare const usernameSchema: z.ZodString;
