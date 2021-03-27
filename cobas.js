import express from 'express'
import QRCode from 'qrcode'
import fs from 'fs'
const app = express()
import { WAConnection,MessageType } from '@adiwajshing/baileys'
const instances = []
const conns = []

const mkZap = async (credential) => {
    const conn = new WAConnection()
    // conn.logLevel = MessageLogLevel.all
    
    if(credential) {
        conn.loadAuthInfo(credential)
    } 
    await conn.connect()
    return conn
}


app.use('/', express.static('public'));
app.get('/instances/:nomor/' , async (req, res) => {
    const nomor = req.params.nomor
    const penerima = req.params.to+'@s.whatsapp.net'
    const pesan = req.params.msg
    const instancex = instances.find(x => x.nama === nomor)
    if (instancex){
        res.status(200).json({ instance: nomor })
        // const instance = instancex
        // const zapance = mkZap({ credential: instance.credential })
        // conns.push({ name: nomor, zapance })
        // // conn.sendMessage (penerima, pesan, MessageType.text)    
        // conn.close()
    }
})
app.get('/listActive' , async (req, res) => {
    console.log(conns)
})
app.get('/listInstances' , async (req, res) => {
    res.status(200).json(instances)
})
app.get('/instances/create/:nomor', async (req, res) => {
    try {
        const nomor = req.params.nomor
        const conn = new WAConnection()
        if (instances.find(x => x.nama === nomor)){
            res.status(200).json({ error: true, message: 'Sudah ada' })
        } else {
            conn.on ('qr', qr => {
                QRCode.toDataURL(qr, function (err, url) {
                    const imageBuffer = Buffer.from(url.replace('data:image/png;base64,',''), 'base64');
                    fs.writeFileSync('public/qr/'+nomor+'.png', imageBuffer);
                });
                res.status(200).json({ qr:qr ,msg: 'silahkan scan qr'})
            })
            conn.on ('open', () => {
                fs.unlinkSync('public/qr/'+nomor+'.png')

            })         
            conn.on ('credentials-updated', () => {
                console.log (`credentials updated!`)
                const authInfo = conn.base64EncodedAuthInfo()
                const nameAuth = {
                    nama :nomor,
                    credential : authInfo
                }
                const instance = 
                instances.push(nameAuth)
                conns.push({ nama: nomor, zapance: conn })
            })
            await conn.connect()

        }
    } catch (err) {
        next(err);
    }
    
    
})
// app.get('/instances/:nomor/connect', async (req, res) => {
//     const iid = req.params.iid
//     const instancex = instances.find(x => x.nama === iid);
//     if (instancex) {
//         const instance = instancex
//         const zapance = mkZap({ credential: instance.credential })
//         conns.push({ nama: iid, zapance })
//         res.status(200).json({ instance: zapance })
//     } else {
//         res.status(404).json({ error: true, message: 'Instance not found!' })
//     }
// })
app.get('/instances/:nomor/send/:to/:msg' , async (req, res) => {
    const nomor = req.params.nomor
    const penerima = req.params.to+'@s.whatsapp.net'
    const pesan = req.params.msg
    const instancex = instances.find(x => x.nama === nomor)
    const idx = conns.findIndex(x => x.nama === nomor)
    
    if (instancex){
        if (conns[idx]){
            const zapance = await conns[idx].zapance
            const sentMsg = zapance.sendMessage (penerima, pesan, MessageType.text)   
            if (sentMsg){
                res.status(200).json({ msg: 'Berhasil terkirim' })
            } 
        }
    } else {
        res.status(404).json({ error: true, message: 'Instance not found!' })
    }
})
app.get('/instances/:nomor/disconnect', async (req, res) => {
    const nomor = req.params.nomor
    const inst = conns.find(x => x.nama === nomor)
    const idx = conns.findIndex(x => x.nama === nomor)
    if (inst) {
            const zapance = await conns[idx].zapance
            zapance.close()
            conns.splice(conns.findIndex(x => x.nama === nomor), 1)
            res.status(200).json({ instance: nomor })
    } else {
        res.status(404).json({ error: true, message: 'Instance not found!' })
    }
})

app.listen(3333)