const express = require('express'); 
const cors = require('cors');
const fs = require('fs').promises;
const bodyParser = require('body-parser')

const app = express(); //alias

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cors()); //Blocks browser from restricting any data

//Welcome Page for the Server 
app.get('/', (req, res) => {
    res.send('Welcome to the Express Server')
})


app.post('/generate-proof', async(req,res)=>{

    try {
        const arr = req.body.arr;
    
        console.log(arr)
        
        let { initialize } = await import("zokrates-js");

        const source = await fs.readFile(`./circuits/${arr[0]}series.zok`, 'utf-8')
        let keypair = await fs.readFile(`./circuits/keypair.txt`, 'utf-8')
        keypair = JSON.parse(keypair)
                
        if(!source || !keypair){
            throw Error("Source or keypair undefined")
        }

        initialize().then((zokratesProvider) => {

            try {
                const artifacts = zokratesProvider.compile(source);
                const { witness, output } = zokratesProvider.computeWitness(artifacts, [arr]);
                
                const proofJson = zokratesProvider.generateProof(
                    artifacts.program,
                    witness,
                    Buffer.from(keypair.provingKey, 'hex')
                );
                
                const proof=[]; 
                proof.push(proofJson.proof.a, proofJson.proof.b, proofJson.proof.c)
        
                res.send({ proofJson, proof })
            } catch (err) {
                res.status(500).send({ message: `zok ${err.message}`, stack: `${err.stack}`})
            }
        })
        
    } catch (err) {
        res.status(500).send({ message: `${err.message}`, stack: `${err.stack}`})
    }

})

const PORT = 3001;

app.listen(PORT, () => console.log(`Running on Port ${PORT}`))
