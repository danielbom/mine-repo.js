#/bin/bash

grep -v "#" "$1" | wc -l
