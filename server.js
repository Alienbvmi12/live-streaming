const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let queue = [];

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/watch', (req, res) => {
    res.sendFile(__dirname + '/public/watch.html');
});

app.get('/stream', (req, res) => {
    res.sendFile(__dirname + '/public/stream.html');
});

function makeid(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result + Date.now().toString();
}

io.on('connection', (socket) => {
    console.log('A user connected');

    io.emit("streaming-list", queue);

    socket.on("streamer-init", data => {
        let streamer_id = "";
        if (data !== "") {
            streamer_id = data;
            socket.streamer = {};
            socket.streamer.id = streamer_id;
        }
        else {
            streamer_id = socket.id + Date.now().toString();
            socket.streamer = {};
            socket.streamer.id = streamer_id;
        }
        let exsist = false;
        queue.forEach((value, index) => {
            if (value === streamer_id) {
                exsist = true;
            }
        });
        if (!exsist) {
            queue.push(streamer_id);
        }
        socket.emit("streamer-init", streamer_id);
        io.emit("streaming-list", queue);
        console.log(queue);
        queue.forEach((val, index) => {
            socket.on(val, data => {
                // console.log(val + " || " + data);
                // let blob = new Blob(data, {type : 'image/jpg'});
                io.emit(val, data);
                // console.log(JSON.stringify(blob));
                // fs.appendFileSync(`video_${streamer_id}.webm`, data);
            });
        });
        socket.emit('streaming-started', "");

        //Stream config init

        // const filePath = `public/video_${streamer_id}.webm`;
        // // fs.writeFile(filePath, "", () => {});
        // const ffmpegCommand = ffmpeg()
        //     .inputFormat('webm')
        //     .inputOptions('-thread_queue_size 512')
        //     .input(`http://localhost:3000/${filePath}`)
        //     .outputOptions('-c:v libx264')
        //     .output(`http://localhost:3000/live/${streamer_id}.m3u8`)
        //     .on('end', () => {
        //         console.log('Streaming ended');
        //     })
        //     .on('error', (err) => {
        //         console.error('Error:', err);
        //     });

        // socket.ffmpegCommand = ffmpegCommand;
        // socket.filePath = filePath;
        // socket.emit('streaming-started', filePath);

        // // Start streaming
        // ffmpegCommand.run();
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected');
        if (socket.hasOwnProperty("streamer")) {
            queue.forEach((value, index) => {
                if (value === socket.streamer.id) {
                    let filePath = __dirname + '/public/stream_ended.txt';
                    fs.readFile(filePath, { encoding: 'utf-8' }, function (err, data) {
                        if (!err) {
                            io.emit(socket.streamer.id, data);
                        } else {
                            console.log(err);
                        }
                    });
                    queue.splice(index);
                }
            });
        }
        io.emit("streaming-list", queue);
        console.log(queue);
        // if (socket.ffmpegCommand) {
        //     socket.ffmpegCommand.kill();
        //     fs.unlinkSync(socket.filePath);
        // }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
