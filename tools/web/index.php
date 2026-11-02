<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tools</title>
    <link rel="stylesheet" href="/style.css" />
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <main>
      <h1>Tools</h1>
      <p>Small calculators and generators, running in your browser.</p>
      <ul>
<?php
// each tool page brings its own <meta name="description">
foreach (glob(__DIR__ . "/*.html") as $file) {
  $desc = get_meta_tags($file)["description"] ?? basename($file, ".html");
  printf(
    "        <li><a href=\"%s\">%s</a></li>\n",
    htmlspecialchars(basename($file)),
    htmlspecialchars($desc)
  );
}
?>
      </ul>
    </main>
    <footer class="foot">
      <a href="/">Home</a> - <a href="/contact.php?origin=tools">Contact</a> -
      <a href="https://github.com/entorb/entorb.net-apps/tree/main/tools" target="_blank" rel="noopener">GitHub</a>
    </footer>
  </body>
</html>
