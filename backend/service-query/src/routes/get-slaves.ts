import { Request, Response, NextFunction } from "express";
import { formatSlaveData } from "../utils/format.js";
import { findAllSlaves } from "../utils/findAllSlaves.js";
import database from "../database/client.js";
import axios from "axios";
import retry from 'async-retry'
import { Readable } from "stream";
import path from "path";

export const getSlavesHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    let connection = null

    try {
        connection = await database.client.getConnection()

        const slaves = await findAllSlaves(connection)

        const response = []

        for (const slave of slaves) {

            const slaveId = slave.id

            const prefix = slaveId.split('-').pop();

            const live = true

            const slaveHost = process.env.SLAVE_HOST!.replace("#", prefix)

            const images = await scrapeImages(`${slaveHost}/api/slave/${slaveId}/output/`, slave.rule_labels);

            response.push(formatSlaveData(slave, live, images))
        }

        res.json({ success: true, message: 'ok', data: response });

    } catch (error) {
        next(error);
    } finally {
        connection?.release?.();
    }
}


async function scrapeImages(baseUrl: string, ruleLabels: string[]): Promise<string[]> {
    const images: string[] = []

    try {
        const queryHTML = await retry(() => axios.get(baseUrl), {
            retries: 2,
            minTimeout: 500,
            maxTimeout: 1500
        });

        const files: string[] = String(queryHTML.data).split(',').filter(Boolean);
        if (files.length === 0) return images;

        const orderedImages: string[] = ruleLabels
            .map(rule => files.find(img => img.startsWith(rule)))
            .filter((img): img is string => Boolean(img));

        const downloads = orderedImages.map(async (file) => {
            const binary = await retry(() =>
                axios.get(`${baseUrl}${file}`, { responseType: 'arraybuffer' }), {
                retries: 2,
                minTimeout: 500,
                maxTimeout: 1500
            });

            const buffer = Buffer.from(binary.data);
            const base64Image = buffer.toString("base64");

            const ext = path.extname(file).toLowerCase().replace(".", "");
            const mimeType = ext === "jpg" ? "jpeg" : ext;

            const base64DataUri = `data:image/${mimeType};base64,${base64Image}`;
            return base64DataUri;
        });

        const results = await Promise.all(downloads);
        images.push(...results);

    } catch (err) {
        console.error(`❌ Error scraping:`, err);
    } finally {
        return images
    }
}
