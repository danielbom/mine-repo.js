#/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )" 

grep "#OK " "$SCRIPT_DIR/../projects/$1" | wc -l
