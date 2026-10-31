<?php
include "../header.php";
printHead("Torben's nm to eV Converter", $matomo_id=6);
ini_set('display_errors', 1);
error_reporting(E_ALL);
?>

<?php

// 22.11.2012
// 228 visitors in the last 7 days, 16329 in total since 2009-02-25.

$version = '2009-02-25';
$origin  = 'nm2eV';

include "../web-stats.php";

function stats_read2($origin = '')
{
  [$accesscounts, $accesscounts7, $firstaccess] = stats_read_main($origin);

  echo "<hr>\n$accesscounts7 conversions in the last 7 days, $accesscounts in total since $firstaccess.";
}

$pnt1 = isset($_POST['pnt1']) ? $_POST['pnt1'] : '';
$pnt2 = isset($_POST['pnt2']) ? $_POST['pnt2'] : '';
$unit = isset($_POST['unit']) ? $_POST['unit'] : 'nm';

if (isset($_POST['submit'])) {
  //updates the access statistics
  stats_update($origin);

  $was = array();
  $womit = array();
  $was[] = "','";
  $womit[] = ".";
  $was[] = "'[^\.\d]+'"; // alles was kein . oder 0-9 ist fliegt, damit auch "-"
  $womit[] = "";
  $pnt1 = preg_replace($was, $womit, $pnt1);
  $pnt2 = preg_replace($was, $womit, $pnt2);
  if ($pnt1 == '')
    $pnt1 = 0;
  else
    $pnt1 = (float)$pnt1;
  if ($pnt2 == '')
    $pnt2 = 0;
  else
    $pnt2 = (float)$pnt2;
}
?>

<form method="post" action="<?php print $_SERVER['PHP_SELF']; ?>" name="nm-ev-converter">
  <table>
    <tr>
      <td>
        <label for="pnt1">Point 1:</label>
        <input type="text" inputmode="decimal" id="pnt1" name="pnt1" value="<?php echo $pnt1 ?>" size="7" tabindex="1">
      </td>
      <td rowspan="2">
        <select id="unit" name="unit" style="height: 4em;" tabindex="3">
          <option <?php if ($unit == "nm")  echo "selected"; ?> value="nm">nm</option>
          <option <?php if ($unit == "eV")  echo "selected"; ?> value="eV">eV</option>
          <option <?php if ($unit == "cm")  echo "selected"; ?> value="cm">cm-1</option>
          <option <?php if ($unit == "THz") echo "selected"; ?> value="THz">THz</option>
        </select>
      </td>
      <td rowspan="2">
        <input type="submit" name="submit" value="Convert" style="height: 4em;" tabindex="4">
      </td>
    </tr>
    <tr>
      <td>
        <label for="pnt2">Point 2:</label>
        <input type="text" inputmode="decimal" id="pnt2" name="pnt2" value="<?php echo $pnt2 ?>" size="7" tabindex="2">
      </td>
    </tr>
  </table>

</form>

<?php
if (isset($_POST['submit'])) {

  $konst_c = 299792458;
  $konst_e = 1.60217733 * pow(10, -19);
  $konst_h = 6.6260755 * pow(10, -34);

  $nm1 = 0;
  $nm2 = 0;
  $nmd = 0;
  $eV1 = 0;
  $eV2 = 0;
  $eVd = 0;
  $cm1 = 0;
  $cm2 = 0;
  $cmd = 0;
  $THz1 = 0;
  $THz2 = 0;
  $THzd = 0;

  function nm2eV($nm)
  {
    global $konst_c, $konst_e, $konst_h;
    return $konst_c * $konst_h / $konst_e / ($nm * pow(10, -9));
  }
  function eV2nm($eV)
  {
    global $konst_c, $konst_e, $konst_h;
    return $konst_c * $konst_h / $konst_e / ($eV * pow(10, -9));
  }
  function nm2cm($nm)
  {
    return 1 / $nm * pow(10, 7);
  }
  function cm2nm($cm)
  {
    return 1 / $cm * pow(10, 7);
  }

  function THz2eV($THz)
  {
    global $konst_e, $konst_h;
    return $THz * $konst_h / $konst_e / pow(10, -12);
  }
  function eV2Hz($eV)
  {
    global $konst_e, $konst_h;
    return $eV * $konst_e / $konst_h * pow(10, -12);
  }

  if ($unit == 'nm') {
    if ($pnt1 > 0) {
      $nm1 = $pnt1;
      $eV1 = nm2eV($pnt1);
      $cm1 = nm2cm($nm1);
      $THz1 = eV2Hz($eV1);
    }
    if ($pnt2 > 0) {
      $nm2 = $pnt2;
      $eV2 = nm2eV($pnt2);
      $cm2 = nm2cm($nm2);
      $THz2 = eV2Hz($eV2);
    }
  } elseif ($unit == 'eV') {
    if ($pnt1 > 0) {
      $eV1 = $pnt1;
      $nm1 = eV2nm($pnt1);
      $cm1 = nm2cm($nm1);
      $THz1 = eV2Hz($eV1);
    }
    if ($pnt2 > 0) {
      $eV2 = $pnt2;
      $nm2 = eV2nm($pnt2);
      $cm2 = nm2cm($nm2);
      $THz2 = eV2Hz($eV2);
    }
  } elseif ($unit == 'cm') {
    if ($pnt1 > 0) {
      $cm1 = $pnt1;
      $nm1 = cm2nm($cm1);
      $eV1 = nm2eV($nm1);
      $THz1 = eV2Hz($eV1);
    }
    if ($pnt2 > 0) {
      $cm2 = $pnt2;
      $nm2 = cm2nm($cm2);
      $eV2 = nm2eV($nm2);
      $THz2 = eV2Hz($eV2);
    }
  } elseif ($unit == 'THz') {
    if ($pnt1 > 0) {
      $THz1 = $pnt1;
      $eV1 = THz2eV($THz1);
      $nm1 = eV2nm($eV1);
      $cm1 = nm2cm($nm1);
    }
    if ($pnt2 > 0) {
      $THz2 = $pnt2;
      $eV2 = THz2eV($THz2);
      $nm2 = eV2nm($eV2);
      $cm2 = nm2cm($nm2);
    }
  }

  // differences
  if ($pnt1 > 0 && $pnt2 > 0) {
    $nmd = $nm2 - $nm1;
    $eVd = $eV2 - $eV1;
    $cmd = $cm2 - $cm1;
    $THzd = $THz2 - $THz1;
  }

  // rounding
  $nm1 = round($nm1, 2);
  $nm2 = round($nm2, 2);
  $nmd = round($nmd, 2);
  $eV1 = round($eV1, 4);
  $eV2 = round($eV2, 4);
  $eVd = round($eVd, 4);
  $cm1 = round($cm1, 0);
  $cm2 = round($cm2, 0);
  $cmd = round($cmd, 0);
  $THz1 = round($THz1, 2);
  $THz2 = round($THz2, 2);
  $THzd = round($THzd, 2);


  $style = "border: 1px solid #333; padding: 5px; ";
  print "<hr>
<table style='border-collapse: collapse; border: 1px solid #333;'>
<thead>
    <tr>
    <th style='$style text-align: center; width: 28%; '>Point 1</th>
    <th style='$style text-align: center; width: 28%; '>Point 2</th>
    <th style='$style text-align: center; width: 28%; '>P2-P1</th>
    <th style='$style'>&nbsp;</th>
    </tr>
</thead>
<tbody>
    <tr>
    <td style='$style text-align: right;'>$nm1</td>
    <td style='$style text-align: right'>$nm2</td>
    <td style='$style text-align: right'>$nmd</td>
    <td style='$style text-align: left; font-weight: bold;'>nm</td>
    </tr>
    <tr>
    <td style='$style text-align: right'>$eV1</td>
    <td style='$style text-align: right'>$eV2</td>
    <td style='$style text-align: right'>$eVd</td>
    <td style='$style text-align: left; font-weight: bold;'>eV</td>
    </tr>
    <tr>
    <td style='$style text-align: right'>$cm1</td>
    <td style='$style text-align: right'>$cm2</td>
    <td style='$style text-align: right'>$cmd</td>
    <td style='$style text-align: left; font-weight: bold;'>cm<sup>-1</sup></td>
    </tr>
    <tr>
    <td style='$style text-align: right'>$THz1</td>
    <td style='$style text-align: right'>$THz2</td>
    <td style='$style text-align: right'>$THzd</td>
    <td style='$style text-align: left; font-weight: bold;'>THz</td>
    </tr>
</tbody>
</table>\n";
}

//displays the access statistics
stats_read2($origin);
printFoot("nm2eV-Converter");
?>
