<?php
if (isset($_SERVER['HTTP_MOD_REWRITE']) && $_SERVER['HTTP_MOD_REWRITE'] === 'On') {
    echo "mod_rewrite работает!";
} else {
    echo "mod_rewrite НЕ активен.";
}
?>