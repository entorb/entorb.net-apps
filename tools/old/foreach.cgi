#!/usr/bin/perl -wT
use strict;
use warnings;
use CGI;
use CGI::Carp qw(fatalsToBrowser);
# use CGI::Carp qw(warningsToBrowser);

my $q = new CGI;

print $q->header( -charset => 'utf-8' );
$_ = $q->start_html(
    -title => 'Foreach Generator',
    -meta  => { 'author' => 'Torben Menke' }
# ,-author=>'Torben Menke' # generates mailto:
# ,-meta  =>{'keywords'=>'Mit Offenen Karten, Liste, Sendungen, mok', 'copyright'=>'BeerWare'}
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
my $webstats_origin = 'foreach';
our $webstats_dbh = dbConnect();
# nur wenn nicht submitted wird
# webstats_update($webstats_origin);

#if (!$q->param) {
print $q->start_form;
print "<table border=\"0\" cellpadding=\"0\" cellspacing=\"0\"><tr>\n";
print "<td>\n";
print "<FIELDSET><LEGEND><b>Text Input</b></LEGEND>\n";
print $q->textarea(
    -name    => 'TextInput',
    -value   => 'Der %A% ist %B%.',
    -rows    => 10,
    -columns => 80,
    -wrap    => 'off'
);
print "</FIELDSET>\n";
print "</td><td>\n";
print "<FIELDSET><LEGEND><b>%A%</b></LEGEND>\n";
print $q->textarea(
    -name    => 'VarA',
    -value   => "Baum\nHut\nMensch",
    -rows    => 10,
    -columns => 10,
);
print "</FIELDSET>\n";
print "</td><td>\n";
print "<FIELDSET><LEGEND><b>%B%</b></LEGEND>\n";
print $q->textarea(
    -name    => 'VarB',
    -value   => "rot\ngrün\nblau",
    -rows    => 10,
    -columns => 10,
);
print "</FIELDSET>\n";
print "</td></tr></table>\n";
#print "</td><td>\n";
print "<br>";
print $q->submit(
    -name  => 'SubmitCart',
    -value => 'Cartesian Product',
);
print " or ";
print $q->submit(
    -name  => 'SubmitScalar',
    -value => 'Scalar Product',
);
#nicht notwendig, da via cart. Produkt geht
#print " or ";
#print $q->submit(
#    -name     => 'A_Text_B',
#    -value    => '[A][Text][B]',
#);

print $q->checkbox(
    -name    => 'add_separatorline',
    -checked => 1,
    -value   => 'ON',
    -label   => 'separate sets by empty lines'
);
#separate sets by empty line'

print $q->end_form;
#} else { # $q->param

if ( not $q->param ) {    # Es wurde nicht Submitted
    webstats_update($webstats_origin);
} else {    # Es wurde Submitted
    my $textIn = $q->param('TextInput');
    $textIn =~ s/\r?\n/\n/g;

    my $limitLines = 100000;
    my $limitChars = 10000;

    my @textOut = ();

    my @A = split /\r?\n/, $q->param('VarA');
    my @B = split /\r?\n/, $q->param('VarB');
    @A = grep { !m/^\s*$/ } @A;    # Leerzeilen raus
    @B = grep { !m/^\s*$/ } @B;    # Leerzeilen raus

    @A = (1) if ( not $textIn =~ m/%A%/ );
    @B = (1) if ( not $textIn =~ m/%B%/ );

    # Security
    die("ERROR: Text too long") if ( length($textIn) > $limitChars );
    foreach my $a (@A) {
        die("ERROR: Too long item in A") if ( length($a) > $limitChars );
    }
    foreach my $b (@B) {
        die("ERROR: Too long item in B") if ( length($b) > $limitChars );
    }

    if ( $q->param('SubmitCart') ) {
        if ( $#A * $#B > $limitLines ) {
            print
                "<p><font color=\"red\">ERROR: Output is limited to $limitLines lines</font></p>\n";
        } else {
            foreach my $a (@A) {
                foreach my $b (@B) {
                    $_ = $textIn;
                    $_ =~ s/%A%/$a/g;
                    $_ =~ s/%B%/$b/g;
                    die("ERROR: Output text too long")
                        if ( length($_) > $limitChars );
                    push @textOut, $_;
                }    #foreach A
                if ( $q->param('add_separatorline') ) { push @textOut, ''; }
            }    # foreach B
        } ## end else [ if ( $#A * $#B > $limitLines)]
    }    #if ($q->param('SubmitCart'))

    elsif ( $q->param('SubmitScalar') ) {
        if ( not $#A == $#B ) {
            print
                "<p><font color=\"red\">ERROR: Scalar product needs eqal length lists %A% and %B%! (here "
                . ( $#A + 1 ) . ":"
                . ( $#B + 1 )
                . ") </font></p>\n";
        } elsif ( $#A > $limitLines or $#B > $limitLines ) {
            print
                "<p><font color=\"red\">ERROR: Output is limited to $limitLines lines</font></p>\n";
        } elsif ( $#A == $#B ) {
            for my $i ( 0 .. $#A ) {
                my $a = $A[ $i ];
                my $b = $B[ $i ];
                $_ = $textIn;
                $_ =~ s/%A%/$a/g;
                $_ =~ s/%B%/$b/g;
                die("ERROR: Output text too long")
                    if ( length($_) > $limitChars );
                push @textOut, $_;
            }    # for
            if ( $q->param('add_separatorline') ) { push @textOut, ''; }
        }    #elsif ($#A == $#B){
    }    # end elsif ($q->param('SubmitScalar'))

    if ( $q->param('add_separatorline') ) { pop @textOut; }    # remove last \n

    print "<br>\n";
    print "<table border=0 cellpadding=0 cellspacing=0><tr><td>\n";
    print "<FORM><FIELDSET><LEGEND><b>Generated Text</b></LEGEND>\n";
    print $q->textarea(
        -name    => 'TextOutput',
        -value   => join( "\n", @textOut ),
        -rows    => $#textOut + 1,
        -columns => 80,
    );
    print "</FIELDSET></FORM></td></tr></table>\n";
} ## end else [ if ( not $q->param ) ]

print "
<h3>Examples</h3>
<p>
,'%A%'<br>
</p>
";

webstats_read($webstats_origin);
our $webstats_dbh->disconnect();

print
    "\n\n<hr>\n<a href=\"/\">Home</a> - <a href=\"/contact.php?origin=Foreach\">Contact</a> - <a href=\"/impressum.php\">Impressum</a>\n</body>\n</html>\n";
print $q->end_html;
