lib.callback.register('hcyk_bossactions:getFinancialStats', function(source, job, timeRange)
    local xPlayer = ESX.GetPlayerFromId(source)
    
    -- Check boss permissions
    if not xPlayer or xPlayer.getJob().name ~= job or xPlayer.getJob().grade_name ~= 'boss' then
        return {
            income = 0,
            expenses = 0,
            netProfit = 0
        }
    end
    
    -- Set default timeRange if not provided
    timeRange = timeRange or "month"
    
    -- Prepare the SQL query based on timeRange
    local dateFilter
    if timeRange == "week" then
        dateFilter = "AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)"
    elseif timeRange == "month" then
        dateFilter = "AND MONTH(date) = MONTH(CURRENT_DATE()) AND YEAR(date) = YEAR(CURRENT_DATE())"
    elseif timeRange == "year" then
        dateFilter = "AND YEAR(date) = YEAR(CURRENT_DATE())"
    else
        -- Default to month
        dateFilter = "AND MONTH(date) = MONTH(CURRENT_DATE()) AND YEAR(date) = YEAR(CURRENT_DATE())"
    end
    
    -- Fetch financial data with proper error handling
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
    
    -- If query failed or returned no results, provide default values
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
    
    -- Check boss permissions
    if not xPlayer or xPlayer.getJob().name ~= job or xPlayer.getJob().grade_name ~= 'boss' then
        return 0
    end
    
    -- Fetch society account balance
    local society = 'society_' .. job
    local money = 0
    
    local success = pcall(function()
        TriggerEvent('esx_addonaccount:getSharedAccount', society, function(account)
            if account then
                money = account.money
            end
        end)
    end)
    
    -- Return the society balance or 0 if there was an error
    return money
end)