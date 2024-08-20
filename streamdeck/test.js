// const path = require('path')
// const sharp = require('sharp')
// const { listStreamDecks, openStreamDeck } = require('@elgato-stream-deck/node')
// const { createCanvas } = require('canvas')
// const fs = require('fs')

import { listStreamDecks, openStreamDeck } from '@elgato-stream-deck/node'
import { createCanvas } from 'canvas'
import sharp from 'sharp'
import path from 'path'

const __dirname = path.dirname(new URL(import.meta.url).pathname)

const devices = await listStreamDecks()
if (!devices[0]) throw new Error('No device found')

const streamDeck = await openStreamDeck(devices[0].path)
await streamDeck.clearPanel()

console.log(streamDeck.NUM_ENCODERS);
