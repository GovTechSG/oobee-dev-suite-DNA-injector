import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const BUCKET = process.env.S3_BUCKET ?? 'oobee-genome-npm-registry';
const REGION = process.env.S3_REGION ?? 'ap-southeast-1';
const REGISTRY_BASE_URL = process.env.S3_REGISTRY_BASE_URL ?? `https://${BUCKET}.s3-website-${REGION}.amazonaws.com`;

function main() {
    const packageJson = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
    const PACKAGE_NAME = packageJson.name;
    const VERSION = packageJson.version;
    const dryRun = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1';

    const tarballName = execSync('npm pack --silent', { encoding: 'utf8' }).trim().split('\n').pop();

    if (!tarballName) {
        throw new Error('Failed to create tarball via npm pack');
    }

    const tarballUrl = `${REGISTRY_BASE_URL}/${PACKAGE_NAME}/-/${tarballName}`;
    const metadataFile = `${PACKAGE_NAME}-metadata.json`;

    const metadata = {
        _id: PACKAGE_NAME,
        name: PACKAGE_NAME,
        'dist-tags': { latest: VERSION },
        versions: {
            [VERSION]: {
                ...packageJson,
                dist: {
                    tarball: tarballUrl
                }
            }
        }
    };

    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));

    if (dryRun) {
        console.log(`Dry run complete. Generated ${tarballName} and ${metadataFile}.`);
        console.log(`Would upload to: s3://${BUCKET}/${PACKAGE_NAME}`);
        return;
    }

    console.log(`Uploading ${tarballName} and metadata to s3://${BUCKET} ...`);

    execSync(`aws s3 cp "${tarballName}" "s3://${BUCKET}/${PACKAGE_NAME}/-/${tarballName}"`, { stdio: 'inherit' });
    execSync(`aws s3 cp "${metadataFile}" "s3://${BUCKET}/${PACKAGE_NAME}" --content-type "application/json"`, { stdio: 'inherit' });
    execSync(`aws s3 cp "${metadataFile}" "s3://${BUCKET}/${PACKAGE_NAME}/index.html" --content-type "application/json"`, { stdio: 'inherit' });

    console.log(`Published ${PACKAGE_NAME}@${VERSION}`);
    console.log(`Registry metadata URL: ${REGISTRY_BASE_URL}/${PACKAGE_NAME}`);
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
    main();
}