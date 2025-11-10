const express = require("express");
const path = require("path");
const fetch = require("node-fetch");

const app = express();

app.get("/:username", async (req, res, next) => {
  const userAgent = req.headers["user-agent"] || "";

  const isBot = /facebookexternalhit|WhatsApp|Twitterbot|Slackbot|LinkedInBot/i.test(userAgent);

  if (!isBot) return next(); // usuário normal → segue para o Flutter

  const username = req.params.username;

  const apiURL = "https://hzmixuvrnzpypriagecv.supabase.co/rest/v1/rpc/fc_share_estabelecimento";

  const response = await fetch(apiURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bWl4dXZybnpweXByaWFnZWN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ5NjkzMTQsImV4cCI6MjA0MDU0NTMxNH0.VHtjYivpM8c9RLmKimwRiLgnb8zqGrZ88Q8vpVLZcZ0",
    },
    body: JSON.stringify({ param_username: username }),
  });

  const data = await response.json();

  if (!data || data[0]?.result !== "True") {
    return res.status(404).send("Estabelecimento não encontrado.");
  }

  const estab = data[0];

  const nome = estab.nome;
  const descricao = estab.descricao || "";
  const segmento = estab.segmento;
  const imagem = estab.foto_perfil;

  const urlFinal = `https://ofertas.app/${username}`;
  const ogDescription = descricao.length > 0 ? `${descricao} - ${segmento}` : segmento;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>${nome}</title>

  <meta property="og:title" content="${nome}"/>
  <meta property="og:description" content="${ogDescription}"/>
  <meta property="og:image" content="${imagem}"/>
  <meta property="og:url" content="${urlFinal}"/>
  <meta property="og:type" content="website"/>

  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${nome}"/>
  <meta name="twitter:description" content="${ogDescription}"/>
  <meta name="twitter:image" content="${imagem}"/>
</head>
<body>
  Redirecionando...
  <script>
    window.location.href = "${urlFinal}";
  </script>
</body>
</html>
`;

  res.send(html);
});

// Servir o Flutter Web
app.use(express.static(path.join(__dirname, "dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist/index.html"));
});

app.listen(3000, () => console.log("Rodando na porta 3000"));
