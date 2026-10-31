#!/usr/bin/perl -w

use strict;
use warnings;
# use 5.010;
use CGI;
my $cgi = new CGI;

#use CGI ":all";
#use CGI qw(:standard);
use CGI::Carp qw(warningsToBrowser fatalsToBrowser);

use List::Util 'shuffle';

print $cgi->header(
  -type    => 'text/html',
  -charset => 'utf-8'
);

$_ = $cgi->start_html(
  -title => 'Torben\'s RPG - Random Password Generator',
  -meta  => {
    'author'   => 'Torben Menke',
    'viewport' => 'width=device-width, initial-scale=1'
      }
      # ,-author=>'Torben Menke' # generates mailto:
      # ,-meta  =>{'keywords'=>'Typo, Spellchecker', 'copyright'=>'BeerWare'}
  ,
  -style => { -src => '/style.css' }
);

my $matomo = "
<!-- Matomo -->
<script>
  var _paq = window._paq = window._paq || [];
  /* tracker methods like \"setCustomDimension\" should be called before \"trackPageView\" */
  _paq.push(['trackPageView']);
  _paq.push(['enableLinkTracking']);
  (function() {
    var u=\"https://entorb.net/stats/matomo/\";
    _paq.push(['setTrackerUrl', u+'matomo.php']);
    _paq.push(['setSiteId', '1']);
    var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
    g.async=true; g.src=u+'matomo.js'; s.parentNode.insertBefore(g,s);
  })();
</script>
<!-- End Matomo Code -->
";
$_ =~ s#</head>##;
$_ = "$_\n$matomo\n</head>\n";
print $_;

do "../web-stats.pl";    # read subs
my $webstats_origin = 'passgen';
our $webstats_dbh = dbConnect();
webstats_update($webstats_origin);

my %o;                   # options / parameters
# filled by form
$o{'len'}   = 20;
$o{'range'} = 4;         # length +/- range
$o{'SZ'}    = 0;
$o{'count'} = 20;

# not filled by form
$o{'lenMin'}   = 8;
$o{'lenMax'}   = 100;
$o{'rangeMin'} = 0;
$o{'rangeMax'} = 9;
$o{'countMin'} = 20;
$o{'countMax'} = 50;

my @sonderzeichen = (
  '(', ')', '[', ']', '{', '}', '.', ',', '!', '?', ':', ';',
  '+', '-', '*', '/', '=', '$', '@', '%', '&', '#'
);

print "<h1>RPG - Random Password Generator</h1>";

# Pruefen der Parameter

if (  $cgi->param("len") =~ m/^\d+$/
  and $cgi->param("len") >= $o{'lenMin'}
  and $cgi->param("len") <= $o{'lenMax'} )
{
  $o{'len'} = $cgi->param("len") + 0;
} ## end if ( $cgi->param("len"...))
if (  $cgi->param("range") =~ m/^\d$/
  and $cgi->param("range") >= $o{'rangeMin'}
  and $cgi->param("range") <= $o{'rangeMax'} )
{
  $o{'range'} = $cgi->param("range") + 0;
} ## end if ( $cgi->param("range"...))
if ( $cgi->param("sonderzeichen") ) {
  $o{'SZ'} = 1;
}
if (  $cgi->param("count") =~ m/^\d+$/
  and $cgi->param("count") >= $o{'countMin'}
  and $cgi->param("count") <= $o{'countMax'} )
{
  $o{'count'} = $cgi->param("count") + 0;
} ## end if ( $cgi->param("count"...))

my @ListOfChars = getListOfChars();

# print "<p>\n";
# print "Parameters:<br>len = '$o{'len'}'<br>\n";
# print "</p>\n";

# generate and print passwords
print "<p><font size='+1'><tt>\n";
#$password."</b></p>\n";
for ( 1 .. $o{'count'} ) {
  print rand_pass( $o{'len'} + int rand( $o{'range'} ) ) . "<br>\n";
}
print "</tt></font></p>\n";

# print form of parameters
print '
<form action="pass-gen.pl" method="POST">
<table>
<tr><td>
<label for="len">base length</label>
</td><td>
<input type="number" id="len" name="len" min="'
    . $o{'lenMin'}
    . '" max="'
    . $o{'lenMax'}
    . '" value="'
    . $o{'len'}
    . '" step="1">
</td></tr>
<tr><td>
<label for="range">range</label>
</td><td>
<input type="number" id="range" name="range" min="'
    . $o{'rangeMin'}
    . '" max="'
    . $o{'rangeMax'}
    . '" value="'
    . $o{'range'}
    . '" step="1">
</td></tr>
<tr><td>
<label for="range">special chars</label>
</td><td>
<input type="checkbox" name="sonderzeichen" value="sonderzeichen" '
    . ( $o{'SZ'} == 1 ? 'checked' : '' ) . ' >
</td></tr>
<tr><td>
<label for="count">count</label>
</td><td>
<input type="number" id="count" name="count" min="'
    . $o{'countMin'}
    . '" max="'
    . $o{'countMax'}
    . '" value="'
    . $o{'count'}
    . '" step="1">
</td></tr>
<tr><td>&nbsp;</td><td>
<input type="submit" value="Generate">
</td></tr>
</table>
</form>
';


sub getListOfChars {
  # wird einmalig ausgeführt
  my @L = ( 'a' .. 'z', 'A' .. 'Z', '0' .. '9' );
  if ( $o{'SZ'} == 1 ) {
    push @L, @sonderzeichen;
  }
  return shuffle(@L);    # Liste mischen um Zufall zu verbessern, sinnvoll?
} ## end sub getListOfChars


sub rand_pass {
  # wird $o{'count'} x ausgeführt
  my ($length) = @_;
  $length += 0;
  my $passwortOK = 0;
  my $password   = '';
  while ( $passwortOK == 0 ) {
    $password = '';
    for ( 1 .. $length ) {
      $_ = int rand( $#ListOfChars + 1 );
      $password .= $ListOfChars[$_];
    }
    $passwortOK = 1
        if ( $password =~ m/[a-z]/
      and $password =~ m/[A-Z]/
      and $password =~ m/[0-9]/ );
  } ## end while ( $passwortOK == 0 )
  return $password;
} ## end sub rand_pass

webstats_read($webstats_origin);
our $webstats_dbh->disconnect();
print
    "\n\n<hr>\n<a href=\"/\">Home</a> - <a href=\"/contact.php?origin=Foreach\">Contact</a> - <a href=\"/impressum.php\">Impressum</a>\n";
print $cgi->end_html;
