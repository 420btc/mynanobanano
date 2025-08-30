About
Generate a video from a prompt and an image.

1. Calling the API
#
Install the client
#
The client provides a convenient way to interact with the model API.

npmyarnpnpmbun

npm install --save @fal-ai/client
Migrate to @fal-ai/client
The @fal-ai/serverless-client package has been deprecated in favor of @fal-ai/client. Please check the migration guide for more information.

Setup your API Key
#
Set FAL_KEY as an environment variable in your runtime.


export FAL_KEY="YOUR_API_KEY"
Submit a request
#
The client API handles the API submit protocol. It will handle the request status updates and return the result when the request is completed.


import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/ltxv-13b-098-distilled/image-to-video", {
  input: {
    prompt: "The astronaut gets up and walks away",
    image_url: "https://storage.googleapis.com/falserverless/example_inputs/ltxv-image-input.jpg"
  },
  logs: true,
  onQueueUpdate: (update) => {
    if (update.status === "IN_PROGRESS") {
      update.logs.map((log) => log.message).forEach(console.log);
    }
  },
});
console.log(result.data);
console.log(result.requestId);
2. Authentication
#
The API uses an API Key for authentication. It is recommended you set the FAL_KEY environment variable in your runtime when possible.

API Key
#
In case your app is running in an environment where you cannot set environment variables, you can set the API Key manually as a client configuration.

import { fal } from "@fal-ai/client";

fal.config({
  credentials: "YOUR_FAL_KEY"
});
Protect your API Key
When running code on the client-side (e.g. in a browser, mobile app or GUI applications), make sure to not expose your FAL_KEY. Instead, use a server-side proxy to make requests to the API. For more information, check out our server-side integration guide.

3. Queue
#
Long-running requests
For long-running requests, such as training jobs or models with slower inference times, it is recommended to check the Queue status and rely on Webhooks instead of blocking while waiting for the result.

Submit a request
#
The client API provides a convenient way to submit requests to the model.


import { fal } from "@fal-ai/client";

const { request_id } = await fal.queue.submit("fal-ai/ltxv-13b-098-distilled/image-to-video", {
  input: {
    prompt: "The astronaut gets up and walks away",
    image_url: "https://storage.googleapis.com/falserverless/example_inputs/ltxv-image-input.jpg"
  },
  webhookUrl: "https://optional.webhook.url/for/results",
});
Fetch request status
#
You can fetch the status of a request to check if it is completed or still in progress.


import { fal } from "@fal-ai/client";

const status = await fal.queue.status("fal-ai/ltxv-13b-098-distilled/image-to-video", {
  requestId: "764cabcf-b745-4b3e-ae38-1200304cf45b",
  logs: true,
});
Get the result
#
Once the request is completed, you can fetch the result. See the Output Schema for the expected result format.


import { fal } from "@fal-ai/client";

const result = await fal.queue.result("fal-ai/ltxv-13b-098-distilled/image-to-video", {
  requestId: "764cabcf-b745-4b3e-ae38-1200304cf45b"
});
console.log(result.data);
console.log(result.requestId);
4. Files
#
Some attributes in the API accept file URLs as input. Whenever that's the case you can pass your own URL or a Base64 data URI.

Data URI (base64)
#
You can pass a Base64 data URI as a file input. The API will handle the file decoding for you. Keep in mind that for large files, this alternative although convenient can impact the request performance.

Hosted files (URL)
#
You can also pass your own URLs as long as they are publicly accessible. Be aware that some hosts might block cross-site requests, rate-limit, or consider the request as a bot.

Uploading files
#
We provide a convenient file storage that allows you to upload files and use them in your requests. You can upload files using the client API and use the returned URL in your requests.


import { fal } from "@fal-ai/client";

const file = new File(["Hello, World!"], "hello.txt", { type: "text/plain" });
const url = await fal.storage.upload(file);
Auto uploads
The client will auto-upload the file for you if you pass a binary object (e.g. File, Data).

Read more about file handling in our file upload guide.

5. Schema
#
Input
#
prompt string
Text prompt to guide generation

negative_prompt string
Negative prompt for generation Default value: "worst quality, inconsistent motion, blurry, jittery, distorted"

loras list<LoRAWeight>
LoRA weights to use for generation

resolution ResolutionEnum
Resolution of the generated video. Default value: "720p"

Possible enum values: 480p, 720p

aspect_ratio AspectRatioEnum
The aspect ratio of the video. Default value: "auto"

Possible enum values: 9:16, 1:1, 16:9, auto

seed integer
Random seed for generation

num_frames integer
The number of frames in the video. Default value: 121

first_pass_num_inference_steps integer
Number of inference steps during the first pass. Default value: 8

second_pass_num_inference_steps integer
Number of inference steps during the second pass. Default value: 8

second_pass_skip_initial_steps integer
The number of inference steps to skip in the initial steps of the second pass. By skipping some steps at the beginning, the second pass can focus on smaller details instead of larger changes. Default value: 5

frame_rate integer
The frame rate of the video. Default value: 24

expand_prompt boolean
Whether to expand the prompt using a language model.

reverse_video boolean
Whether to reverse the video.

enable_safety_checker boolean
Whether to enable the safety checker. Default value: true

enable_detail_pass boolean
Whether to use a detail pass. If True, the model will perform a second pass to refine the video and enhance details. This incurs a 2.0x cost multiplier on the base price.

temporal_adain_factor float
The factor for adaptive instance normalization (AdaIN) applied to generated video chunks after the first. This can help deal with a gradual increase in saturation/contrast in the generated video by normalizing the color distribution across the video. A high value will ensure the color distribution is more consistent across the video, while a low value will allow for more variation in color distribution. Default value: 0.5

tone_map_compression_ratio float
The compression ratio for tone mapping. This is used to compress the dynamic range of the video to improve visual quality. A value of 0.0 means no compression, while a value of 1.0 means maximum compression.

constant_rate_factor integer
The constant rate factor (CRF) to compress input media with. Compressed input media more closely matches the model's training data, which can improve motion quality. Default value: 29

image_url string
Image URL for Image-to-Video task


{
  "prompt": "The astronaut gets up and walks away",
  "negative_prompt": "worst quality, inconsistent motion, blurry, jittery, distorted",
  "loras": [],
  "resolution": "720p",
  "aspect_ratio": "auto",
  "num_frames": 121,
  "first_pass_num_inference_steps": 8,
  "second_pass_num_inference_steps": 8,
  "second_pass_skip_initial_steps": 5,
  "frame_rate": 24,
  "expand_prompt": false,
  "reverse_video": false,
  "enable_safety_checker": true,
  "enable_detail_pass": false,
  "temporal_adain_factor": 0.5,
  "tone_map_compression_ratio": 0,
  "constant_rate_factor": 29,
  "image_url": "https://storage.googleapis.com/falserverless/example_inputs/ltxv-image-input.jpg"
}
Output
#
video File
The generated video file.

prompt string
The prompt used for generation.

seed integer
The seed used for generation.


{
  "video": {
    "url": "https://storage.googleapis.com/falserverless/example_outputs/ltxv-image-to-video-output.mp4"
  },
  "prompt": "The astronaut gets up and walks away"
}
Other types
#
File
#
url string
The URL where the file can be downloaded from.

content_type string
The mime type of the file.

file_name string
The name of the file. It will be auto-generated if not provided.

file_size integer
The size of the file in bytes.

file_data string
File data

LoRAWeight
#
path string
URL or path to the LoRA weights.

weight_name string
Name of the LoRA weight. Only used if path is a HuggingFace repository, and is only required when the repository contains multiple LoRA weights.

scale float
Scale of the LoRA weight. This is a multiplier applied to the LoRA weight when loading it. Default value: 1

Related Models