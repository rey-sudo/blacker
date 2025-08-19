import crypto from 'crypto';

export function sha256sum(data: any) {
    if (!data) {
        throw new Error('Error hashing 256 data not found')
    }
    
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}