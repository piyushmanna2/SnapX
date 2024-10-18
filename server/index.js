require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const imageAnalysisPrompt = `Analyze the given image and determine the most suitable response type: answer, summary, or explanation. Based on your assessment, generate a concise response addressing the image's content using only HTML tags. Do not use any non-HTML tags or MDX format in your response.
`;

app.post('/analyze-image', async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent([
      imageAnalysisPrompt,
      {
        inlineData: {
          mimeType: "image/png;base64",
          data: image
        }
      }
    ]);

    const response = await result.response;
    const analysisResult = response.text();

    res.json({ analysis: analysisResult });
  } catch (error) {
    console.error('Error analyzing image:', error);
    res.status(500).json({ error: 'An error occurred while analyzing the image' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});