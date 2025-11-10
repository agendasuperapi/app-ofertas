<?php
$username = rtrim($_GET['username'] ?? '', '/');

if (!$username) {
  http_response_code(400);
  echo 'Username não fornecido.';
  exit;
}

$api_url = 'https://hzmixuvrnzpypriagecv.supabase.co/rest/v1/rpc/fc_share_estabelecimento';
$headers = [
  'Content-Type: application/json',
  'apikey: ' . 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bWl4dXZybnpweXByaWFnZWN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ5NjkzMTQsImV4cCI6MjA0MDU0NTMxNH0.VHtjYivpM8c9RLmKimwRiLgnb8zqGrZ88Q8vpVLZcZ0'
];

$options = [
  'http' => [
    'method' => 'POST',
    'header' => implode("\r\n", $headers),
    'content' => json_encode(['param_username' => $username])
  ]
];

$context = stream_context_create($options);
$response = file_get_contents($api_url, false, $context);
$data = json_decode($response, true);

if (!$data || $data[0]['result'] !== 'True') {
  http_response_code(404);
  echo 'Estabelecimento não encontrado.';
  exit;
}

$estab = $data[0];
$nome = htmlspecialchars($estab['nome']);
$descricao = htmlspecialchars($estab['descricao'] ?? '');
$segmento = htmlspecialchars($estab['segmento']);
$imagem = $estab['foto_perfil'];
$url_final = "https://agendasuper.com/{$username}";
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title><?= $nome ?></title>
  
  <meta property="og:title" content="<?= $nome ?>" />
  <meta property="og:description" content="<?= $descricao ? $descricao . ' - ' . $segmento : $segmento ?>" />
  <meta property="og:image" content="<?= $imagem ?>" />
  <meta property="og:url" content="<?= $url_final ?>" />
  <meta property="og:type" content="website" />
  
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="<?= $nome ?>">
  <meta name="twitter:description" content="<?= $descricao ? $descricao . ' - ' . $segmento : $segmento ?>">
  <meta name="twitter:image" content="<?= $imagem ?>">
</head>
<body>
  Redirecionando para o estabelecimento <?= $nome ?>...
</body>
</html>
