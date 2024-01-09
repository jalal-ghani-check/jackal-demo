const express = require('express');
const multer = require('multer');
const { MnemonicWallet, WalletHandler, FileIo, StorageHandler } = require('@jackallabs/jackal.nodejs');
const { FileUploadHandler } = require('@jackallabs/jackal.nodejs');

const fs = require('fs');
const path = require('path')
const { log } = require('console');

const app = express();
const port = '8000'
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
})



const appConfig = {
  signerChain: 'lupulella-2',
  queryAddr: 'https://testnet-grpc.jackalprotocol.com',
  txAddr: 'https://testnet-rpc.jackalprotocol.com'
};

let wallet;
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

// Instantiate the wallet
(async () => {
  const mnemonic = 'burden tiger service melt elbow like shove special poet detect session angle';
  const m = await MnemonicWallet.create(mnemonic);
  wallet = await WalletHandler.trackWallet(appConfig, m);

  // Attach the wallet instance to every request
  app.use((req, res, next) => {
    req.wallet = wallet;
    next();
  });
})();




app.post('/upload', upload.single('file'), async (req, res) =>
 {
      const { originalname: fileName } = req.file;
      if (!wallet)
      {
            return res.status(500).send('Wallet not instantiated.');
      }
      const fileIo = await FileIo.trackIo(wallet);
      const minimumProviderVersion = '1.0.9'
      const fileIos = await FileIo.trackIo(wallet, minimumProviderVersion)
      const parentFolderPath = 's/Home/ohhNFT';

      const parent = await fileIo.downloadFolder(parentFolderPath);
      if (!parent) {
        const listOfRootFolders = ['parent'];
        const storage = await StorageHandler.trackStorage(wallet);
        const msg = storage.makeStorageInitMsg();
        const homeFolder = await fileIos.downloadFolder('s/Home');
        await fileIo.createFolders(homeFolder, listOfRootFolders);
        await fileIos.verifyFoldersExist(listOfRootFolders);
      }

      const childFolderPath = 's/Home/ohhNFT/images';
      const childFolder = await fileIo.downloadFolder(childFolderPath);
      if (!childFolder) {
        const listOfChildFolders = ['child'];
        await fileIo.createFolders(parent || homeFolder, listOfChildFolders);
      }

      const existingOrCreatedChildFolder = await fileIo.downloadFolder(childFolderPath);
      if (existingOrCreatedChildFolder) {

          const file = req.file;
          const fileData = fs.readFileSync(file.path); 
          const dir = await fileIo.downloadFolder("s/Home/ohhNFT/images");
          const handler = await FileUploadHandler.trackFile(new File([fileData], fileName), dir.getMyPath());
          const uploadList = {};
          uploadList[fileName] = {
          data: null,
          exists: false,
          handler: handler,
          key: fileName,
          uploadable: await handler.getForUpload(),
        };
        try {
              const tracker = { timer: 0, complete: 0 };
              await fileIo.staggeredUploadFiles(uploadList, existingOrCreatedChildFolder, tracker);
            // Delete the temporary uploaded file
              fs.unlinkSync(req.file.path);
              res.send('File uploaded successfully!');
        } 
        catch (error)
         {
                res.status(500).send('Error uploading file.');
        }
      } else {
        res.status(500).send('Error: Child folder does not exist or there was an error creating it.');
      }
});





app.get('/download', async (req, res) => {
        try
        {
          const fileIo = await FileIo.trackIo(wallet);
          const downloadDetails = 
          {
              rawPath: 's/Home/ohhNFT/images/dummy.jpeg',
              owner: 'jkl17dp3vlptrv5lzs3l79f9t9egluwkf8js33dfyq',
              isFolder: false 
         };

          const dir = await fileIo.downloadFile(downloadDetails, { track: 0 });
          const fileName ='dummy.jpeg';
          const fileDatas = await dir.receiveBacon().arrayBuffer();
          res.set({'Content-Disposition': `attachment; filename="${fileName}"`  });
          const localFilePath = path.join(__dirname, 'downloads', fileName);
          fs.writeFileSync(localFilePath, Buffer.from(fileDatas));
          res.send(Buffer.from('file downloading successfully'));
  } catch (error) {
    res.status(500).send('Error downloading file.');
  }
});





























