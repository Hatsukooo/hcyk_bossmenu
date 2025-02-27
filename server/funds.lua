lib.callback.register('hcyk_bossactions:getFinancialStats', function(source, job, timeRange)
    local xPlayer = ESX.GetPlayerFromId(source)
    
    if not xPlayer or xPlayer.getJob().name ~= job or xPlayer.getJob().grade_name ~= 'boss' then
        return {
            income = 0,
            expenses = 0,
            netProfit = 0
        }
    end
    
    timeRange = timeRange or "month"
    
    local dateFilter
    if timeRange == "week" then
        dateFilter = "AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)"
    elseif timeRange == "month" then
        dateFilter = "AND MONTH(date) = MONTH(CURRENT_DATE()) AND YEAR(date) = YEAR(CURRENT_DATE())"
    elseif timeRange == "year" then
        dateFilter = "AND YEAR(date) = YEAR(CURRENT_DATE())"
    else
        dateFilter = "AND MONTH(date) = MONTH(CURRENT_DATE()) AND YEAR(date) = YEAR(CURRENT_DATE())"
    end
    
    local result
    local success = pcall(function()
        result = MySQL.Sync.fetchAll([[
            SELECT 
                COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
                COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expenses,
                COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as netProfit
            FROM job_revenues 
            WHERE job_name = ? ]] .. dateFilter, 
            {job}
        )
    end)
    
    if not success or not result or #result == 0 then
        return {
            income = 0,
            expenses = 0,
            netProfit = 0
        }
    end
    
    return result[1]
end)

lib.callback.register('hcyk_bossactions:getSocietyMoney', function(source, job)
    local xPlayer = ESX.GetPlayerFromId(source)
        if not xPlayer or xPlayer.getJob().name ~= job or xPlayer.getJob().grade_name ~= 'boss' then
        return 0
    end
    
    local society = 'society_' .. job
    local money = 0
    
    local success = pcall(function()
        TriggerEvent('esx_addonaccount:getSharedAccount', society, function(account)
            if account then
                money = account.money
            end
        end)
    end)
    
    return money
end)