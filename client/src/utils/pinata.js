/**
 * Pinata IPFS upload utility.
 *
 * Setup:
 *   1. Sign up at https://app.pinata.cloud
 *   2. Create an API key (V2 keys → "New Key" → enable pinFileToIPFS)
 *   3. Copy the API Key and Secret Key into client/.env:
 *        REACT_APP_PINATA_API_KEY=your_api_key
 *        REACT_APP_PINATA_SECRET_KEY=your_secret_key
 *
 * Usage:
 *   const cid = await uploadToIPFS(file);
 *   const url = getIPFSUrl(cid);
 */

const PINATA_API_KEY    = process.env.REACT_APP_PINATA_API_KEY    || "";
const PINATA_SECRET_KEY = process.env.REACT_APP_PINATA_SECRET_KEY || "";
const PINATA_PIN_URL    = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const PINATA_GATEWAY    = "https://gateway.pinata.cloud/ipfs";

/**
 * Upload a File object to IPFS via Pinata.
 * @param {File} file  The File to upload.
 * @param {string} name  Optional display name stored in Pinata metadata.
 * @returns {Promise<string>} The IPFS CID (content identifier).
 */
export async function uploadToIPFS(file, name = "") {
  if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
    throw new Error(
      "Pinata API keys not set. Add REACT_APP_PINATA_API_KEY and " +
      "REACT_APP_PINATA_SECRET_KEY to client/.env and restart the dev server."
    );
  }

  const formData = new FormData();
  formData.append("file", file);

  const metadata = JSON.stringify({
    name: name || file.name,
    keyvalues: { uploadedAt: new Date().toISOString() },
  });
  formData.append("pinataMetadata", metadata);

  const options = JSON.stringify({ cidVersion: 1 });
  formData.append("pinataOptions", options);

  const response = await fetch(PINATA_PIN_URL, {
    method:  "POST",
    headers: {
      pinata_api_key:        PINATA_API_KEY,
      pinata_secret_api_key: PINATA_SECRET_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pinata upload failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.IpfsHash; // the CID
}

/**
 * Returns the public gateway URL for a given IPFS CID.
 * @param {string} cid  The IPFS content identifier.
 * @returns {string}
 */
export function getIPFSUrl(cid) {
  if (!cid) return "";
  return `${PINATA_GATEWAY}/${cid}`;
}
