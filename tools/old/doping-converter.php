<?php
include "../header.php";
printHead("Torben's Doping Converter");

$version = '2012-12-19';
$origin  = 'dopingconverter';

include "../web-stats.php";

function stats_read2($origin = '')
{
  [$accesscounts, $accesscounts7, $firstaccess] = stats_read_main($origin);

  echo "<hr>\n$accesscounts7 conversions in the last 7 days, $accesscounts in total since $firstaccess.";
}

$submit_wt = isset($_POST['submit_wt']) ? $_POST['submit_wt'] : '';
$submit_mol = isset($_POST['submit_mol']) ? $_POST['submit_mol'] : '';
$submit_MR = isset($_POST['submit_MR']) ? $_POST['submit_MR'] : '';

$MMH = isset($_POST['MMH']) ? $_POST['MMH'] : '';
$MMD = isset($_POST['MMD']) ? $_POST['MMD'] : '';
$wt = isset($_POST['wt']) ? $_POST['wt'] : '';
$mol = isset($_POST['mol']) ? $_POST['mol'] : '';
$MR = isset($_POST['MR']) ? $_POST['MR'] : '';

if ($submit_wt || $submit_mol || $submit_MR) {
  //updates the access statistics
  stats_update($origin);
}

print "
<p><div align=\"left\"><i>Version $version, by
  <a href=\"/contact.php?origin=nm_calc\">Torben Menke</a>
  </i></div></p>\n";

// sauber machen
$was = array();
$womit = array();
$was[] = "','";
$womit[] = ".";
$was[] = "'[^\.\d]+'"; // alles was kein . oder 0-9 ist fliegt
$womit[] = "";
$MMH = preg_replace($was, $womit, $MMH);
if ($MMH == '') $MMH = 0;
$MMD = preg_replace($was, $womit, $MMD);
if ($MMD == '') $MMD = 0;
$wt = preg_replace($was, $womit, $wt);
if ($wt == '') $wt = 0;
$mol = preg_replace($was, $womit, $mol);
if ($mol == '') $mol = 0;
$MR = preg_replace($was, $womit, $MR);
if ($MR == '') $MR = 0;

if (($submit_wt or $submit_mol or $submit_MR) and ($MMH == 0 or $MMD == 0)) {
  print "<font color='red'>Enter Molar Mass!</font><br>\n";
  unset($submit_wt, $submit_mol, $submit_MR);
}

if (($submit_wt and $wt == 0) or ($submit_mol and $mol == 0) or ($submit_MR and $MR == 0)) {
  print "<font color='red'>Enter Value!</font><br>\n";
  unset($submit_wt, $submit_mol, $submit_MR);
}

if ($submit_wt) {
  $wt = 0.01 * $wt;
  $MR = 0;
  $mol = 0;
}
if ($submit_mol) {
  $mol = 0.01 * $mol;
  $MR = 0;
  $wt = 0;
}
if ($submit_MR) {
  $wt = 0;
  $mol = 0;
}

if ($submit_wt) {
  if ($MMH > 0 and $MMD > 0) {
    $MR = 1 / ($MMD / $MMH * (1 / $wt - 1));
  }
  $mol = $MR / (1 + $MR);
}
if ($submit_mol) {
  $MR = $mol / (1 - $mol);
  if ($MMH > 0 and $MMD > 0) {
    $wt = 1 / (1 + $MMH / $MMD / $MR);
  }
}
if ($submit_MR) {
  $mol = $MR / (1 + $MR);
  if ($MMH > 0 and $MMD > 0) {
    $wt = 1 / (1 + $MMH / $MMD / $MR);
  }
}

$wt = 100 * $wt; // % rein
$mol = 100 * $mol; // % rein

$MR  = sprintf("%.5f", round($MR, 5));
$wt  = sprintf("%.2f", round($wt, 2));
$mol  = sprintf("%.2f", round($mol, 2));

?>

<form method="post" action="<?php echo htmlspecialchars($_SERVER['PHP_SELF']); ?>" name="nm-ev-converter">
  <table border="1" cellpadding="2" cellspacing="2" width="">
    <tbody>
      <tr>
        <th>Molar Mass Host</th>
        <td><input name="MMH" value="<?php echo $MMH ?>" size="7"></td>
        <td>in g/mol</td>
      </tr>
      <tr>
        <th>Molar Mass Dopant</th>
        <td><input name="MMD" value="<?php echo $MMD ?>" size="7"></td>
        <td>in g/mol</td>
      </tr>
      <tr>
        <th>Weight% (wt%)</th>
        <td><input name="wt" value="<?php echo $wt ?>" size="7"></td>
        <td><input value="Convert" name="submit_wt" type="submit"></td>
      </tr>
      <th>Molar% (mol%)</th>
      <td><input name="mol" value="<?php echo $mol ?>" size="7"></td>
      <td><input value="Convert" name="submit_mol" type="submit"></td>
      </tr>
      <th>Molar Ratio (MR)</th>
      <td><input name="MR" value="<?php echo $MR ?>" size="7"></td>
      <td><input value="Convert" name="submit_MR" type="submit"></td>
      </tr>
    </tbody>
  </table>
</form>

<br><br>
Some Materials used at IAPP
<table border="1" cellpadding="2" cellspacing="2" width="">
  <thead>
    <tr>
      <th>Material</th>
      <th>Molar Mass</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>AOB</td>
      <td>265.353</td>
    </tr>
    <tr>
      <td>BF-DPB</td>
      <td>720.941</td>
    </tr>
    <tr>
      <td>C60</td>
      <td>720.642</td>
    </tr>
    <tr>
      <td>C60F36</td>
      <td>1404.58</td>
    </tr>
    <tr>
      <td>Cr2(hpp)4</td>
      <td>656.753</td>
    </tr>
    <tr>
      <td>F4-TCNQ</td>
      <td>276.149</td>
    </tr>
    <tr>
      <td>F6-TCNNQ</td>
      <td>362.188</td>
    </tr>
    <tr>
      <td>MeO-TPD</td>
      <td>608.725</td>
    </tr>
    <tr>
      <td>o-MeO-DMBI</td>
      <td>254.327</td>
    </tr>
    <tr>
      <td>OH-DMBI</td>
      <td>240.3</td>
    </tr>
    <tr>
      <td>Pentacene</td>
      <td>278.35</td>
    </tr>
    <tr>
      <td>W2(hpp)4</td>
      <td>920.441</td>
    </tr>
    <tr>
      <td>ZnPc</td>
      <td>577.92</td>
    </tr>
  </tbody>
</table>

<?php
//displays the access statistics
stats_read($origin);
printFoot();
?>
