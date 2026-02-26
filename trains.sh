#!/bin/bash

set -e

debug () {
	if [[ -n "$DEBUG" ]];then
		echo "$1"
	fi
}
# Fetch stops
stopurl="https://api.ridango.com/v2/64/intercity/originstops"
debug "Getting stops from $stopurl"

stops=$(http "$stopurl")

debug "$stops"

stop_name () {
	echo $stops | jq -r ".[].stop_name" | fzf --prompt=$1
}

stop_id () {
	echo $stops | jq -r ".[] | select(.stop_name==\"$1\") | .stop_area_id"
}

start_id=$(stop_id "$(stop_name "Algus: ")")
end_id=$(stop_id "$(stop_name "Lõpp: ")")

curdate=$(date -Idate)

tripurl="https://api.ridango.com/v2/64/intercity/stopareas/trips/direct"
debug "Getting trips from $tripurl, start=$start_id stop=$end_id date=$curdate"
trips=$(http PUT "$tripurl" "channel=web" "origin_stop_area_id=$start_id" "destination_stop_area_id=$end_id" "date=$curdate")

debug "$trips"

convert_date () {
	gdate -d "${1%.*}${1:(-6)}" +"%H:%M"
}

highlight_time () {
    current_time=$(date +"%H:%M")
    if [[ $1 > $current_time ]]; then
        echo -e "\033[32m$1\033[0m"  
    else
        echo -e "\033[31m$1\033[0m"  
    fi
}

echo $trips | jq -r '(["Nimi","Väljub","Saabub"] | (., map(length*"-"))), (.journeys[].trips[] | [.trip_short_name, .departure_time, .arrival_time]) | @tsv' | while IFS=$'\t' read -r trip_name departure_time arrival_time; do
	if [[ $trip_name == "Nimi" || $trip_name == "----" ]]; then
		departure_time=$(echo -e "\033[0m$departure_time\033[0m")
		echo -e "$trip_name\t$departure_time\t$arrival_time"
	else
		debug "Original departure time $departure_time"
		departure_time=$(convert_date "$departure_time")
		debug "Converted departure time $departure_time"
		departure_time=$(highlight_time "$departure_time")  # Highlight departure time
		arrival_time=$(convert_date "$arrival_time")
		echo -e "$trip_name\t$departure_time\t$arrival_time"
	fi
done | column -ts $'\t'
