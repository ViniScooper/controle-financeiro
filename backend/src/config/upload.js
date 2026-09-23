// ============================================================
// backend/src/config/upload.js — Upload com Oracle Cloud Bucket
// ============================================================

const multer = require("multer");
const path   = require("path");
const fs     = require("fs");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

// Credenciais do Bucket OCI (Always Free Oracle Cloud)
const OCI_ENDPOINT   = process.env.OCI_ENDPOINT   || "https://gr88wz9mdro0.compat.objectstorage.sa-saopaulo-1.oraclecloud.com";
const OCI_REGION     = process.env.OCI_REGION     || "sa-saopaulo-1";
const OCI_BUCKET     = process.env.OCI_BUCKET     || "boteco-sivirino-fotos";
const OCI_ACCESS_KEY = process.env.OCI_ACCESS_KEY || "7f0368e0766684b28d9031d0caaa56c542aaee3a";
const OCI_SECRET_KEY = process.env.OCI_SECRET_KEY || "yQ+YqrRLhMhJrpsx0zruFxQ+QYvDZIOO9AZA1PZKPf8=";
const OCI_PUBLIC_URL = process.env.OCI_PUBLIC_URL || "https://objectstorage.sa-saopaulo-1.oraclecloud.com/n/gr88wz9mdro0/b/boteco-sivirino-fotos/o";

// Cliente S3 configurado para Oracle Cloud Object Storage
const s3Client = new S3Client({
    region: OCI_REGION,
    endpoint: OCI_ENDPOINT,
    credentials: {
        accessKeyId: OCI_ACCESS_KEY,
        secretAccessKey: OCI_SECRET_KEY
    },
    forcePathStyle: true // Necessário para a API compatível S3 da Oracle
});

// Multer armazena na memória RAM para fazer streaming direto pro Bucket
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const permitidos = /jpeg|jpg|png|webp/;
    const extOk  = permitidos.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = permitidos.test(file.mimetype);
    if (extOk && mimeOk) cb(null, true);
    else cb(new Error("Apenas imagens JPG, PNG e WebP são permitidas."));
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB máximo
});

/**
 * Envia o arquivo recebido para o Bucket da Oracle Cloud
 * @param {Object} file - Objeto req.file do Multer
 * @returns {Promise<string>} URL pública final da imagem no Bucket
 */
const uploadParaBucket = async (file) => {
    if (!file) return null;

    const ext = path.extname(file.originalname).toLowerCase();
    const nomeUnico = `prato-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

    const command = new PutObjectCommand({
        Bucket: OCI_BUCKET,
        Key: nomeUnico,
        Body: file.buffer,
        ContentType: file.mimetype
    });

    await s3Client.send(command);

    // Retorna a URL pública do Bucket
    return `${OCI_PUBLIC_URL}/${nomeUnico}`;
};

module.exports = {
    upload,
    uploadParaBucket
};

