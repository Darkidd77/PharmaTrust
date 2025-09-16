'use strict';

const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        // Correctly resolve the path to the test-network directory
        const testNetworkRoot = path.resolve(__dirname, '..', 'fabric-samples', 'test-network');
        const connectionProfilePath = path.join(testNetworkRoot, 'organizations/peerOrganizations/org1.example.com/connection-org1.json');
        const ccp = JSON.parse(fs.readFileSync(connectionProfilePath, 'utf8'));

        // Create a new CA client for interacting with the CA.
        const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the user.
        const identity = await wallet.get('user1');
        if (identity) {
            console.log('An identity for the user "user1" already exists in the wallet');
            return;
        }

        // Enroll the user, and import the new identity into the wallet.
        // The user must be pre-registered in the CA. We did this in the setup.
        const enrollment = await ca.enroll({ enrollmentID: 'user1', enrollmentSecret: 'user1pw' });
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };
        await wallet.put('user1@org1.example.com', x509Identity);
        console.log('Successfully enrolled user "user1" and imported it into the wallet');

    } catch (error) {
        console.error(`Failed to enroll user "user1": ${error}`);
        process.exit(1);
    }
}

main();