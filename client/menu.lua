function OpenBossMenu(job)
    local playerJob = ESX.GetPlayerData().job

    debugPrint("Attempting to open menu for job:", job, "Player's job:", playerJob.name, "Current menu state:", IsMenuOpen())

    if IsMenuOpen() then
        debugPrint("WARNING: Menu appears to already be open! Forcing reset...")
        ResetMenuState()
        Wait(100)
    end

    if not playerJob then
        lib.notify({
            title = 'Boss Menu',
            description = 'Chyba při načítání dat hráče',
            type = 'error'
        })
        return
    end

    if job ~= playerJob.name then
        debugPrint("Job mismatch! Requested job:", job, "Player's job:", playerJob.name)
        lib.notify({
            title = 'Boss Menu',
            description = 'Nejsi boss této frakce',
            type = 'error'
        })
        return
    end
    
    -- is in allowed grades
    if not lib.contains(Config.AllowedGrades, playerJob.grade_name) then
        debugPrint("Grade check failed! Player's grade_name:", playerJob.grade_name)
        lib.notify({
            title = 'Boss Menu',
            description = 'Nemáš přístup k boss menu',
            type = 'error'
        })
        return
    end
    
    debugPrint("Validation passed, opening menu for job:", job)
    SetMenuOpen(true)
    debugPrint("Menu state set to open:", IsMenuOpen())
    
    SendNUIMessage({
        action = 'setVisible',
        data = true,
        job = job,
        playerData = {
            job = playerJob.name,
            grade = playerJob.grade,
            grade_name = playerJob.grade_name
        }
    })
    
    SetNuiFocus(true, true)
    
    Citizen.CreateThread(function()
        local jobData, employees, societyMoney
        
        lib.callback('hcyk_bossactions:getJobData', 1000, function(result)
            jobData = result or { grades = {} }
            
            SendNUIMessage({
                action = 'updateJobData',
                jobData = jobData
            })
            
            lib.callback('hcyk_bossactions:getEmployees', 1000, function(result)
                employees = result or {}
                
                SendNUIMessage({
                    action = 'updateEmployees',
                    employees = employees
                })
                
                lib.callback('hcyk_bossactions:getSocietyMoney', 1000, function(result)
                    societyMoney = result or 0
                    
                    SendNUIMessage({
                        action = 'updateSocietyMoney',
                        societyMoney = societyMoney
                    })
                end, job)
            end, job)
        end, job)
    end)
end