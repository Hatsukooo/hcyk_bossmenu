fx_version 'cerulean'
game 'gta5'
lua54 'yes'

author 'Hatcyk'
description 'hcyk_bossactions'
version '1.0.0'

shared_scripts {
    'config.lua',
    '@ox_lib/init.lua',
}

client_scripts {
    '@PolyZone/client.lua',
    '@PolyZone/BoxZone.lua',
    'client/zones.lua',
    'client/menu.lua',
    'client/main.lua'
}

server_scripts {
    '@oxmysql/lib/MySQL.lua',
    'server/mysql_wrapper.lua',
    'server/main.lua',
    'server/jobs.lua',
    'server/funds.lua'
}

files {
    'web/build/index.html',
    'web/build/**/*'
}

ui_page 'web/build/index.html'

dependencies {
    'hcyk_markers',
    'PolyZone',
    'hcyk_poly',
}